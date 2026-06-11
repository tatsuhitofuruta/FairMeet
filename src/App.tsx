import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MemberList, type MemberInputState } from './components/MemberList';
import { ModeSelector } from './components/ModeSelector';
import { ResultList } from './components/ResultList';
import { buildAdjacencyList, loadGraphData } from './lib/graph';
import { findMeetingStations, type MeetingCandidate } from './lib/scoring';
import { resolveUniqueStation } from './lib/search';
import type { AdjacencyList, GraphData, SearchMode } from './lib/types';

const initialMembers: MemberInputState[] = [
  { id: 1, text: '', stationIndex: null, error: null },
  { id: 2, text: '', stationIndex: null, error: null },
];

export function App() {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [adjacency, setAdjacency] = useState<AdjacencyList | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [members, setMembers] = useState<MemberInputState[]>(initialMembers);
  const [mode, setMode] = useState<SearchMode>('fair');
  const [results, setResults] = useState<MeetingCandidate[]>([]);
  const [disconnectedMemberIndexes, setDisconnectedMemberIndexes] = useState<number[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const distanceCacheRef = useRef(new Map<number, Float64Array>());
  const lastSearchRef = useRef<{ key: string; memberStationIndexes: number[] } | null>(null);
  const graphLoadPromiseRef = useRef<Promise<{ graph: GraphData; adjacency: AdjacencyList }> | null>(null);

  const fetchGraph = useCallback(
    async (forceReload = false) => {
      if (!forceReload && graph && adjacency) {
        return { graph, adjacency };
      }
      if (!forceReload && graphLoadPromiseRef.current) {
        return graphLoadPromiseRef.current;
      }

      setIsLoadingGraph(true);
      setLoadError(null);
      graphLoadPromiseRef.current = loadGraphData()
        .then((loadedGraph) => {
          const loadedAdjacency = buildAdjacencyList(loadedGraph);
          setGraph(loadedGraph);
          setAdjacency(loadedAdjacency);
          distanceCacheRef.current.clear();
          return { graph: loadedGraph, adjacency: loadedAdjacency };
        })
        .catch((error) => {
          setLoadError(error instanceof Error ? error.message : 'graph.json の読み込みに失敗しました');
          throw error;
        })
        .finally(() => {
          graphLoadPromiseRef.current = null;
          setIsLoadingGraph(false);
        });

      return graphLoadPromiseRef.current;
    },
    [adjacency, graph],
  );

  const retryFetchGraph = useCallback(() => {
    void fetchGraph(true).catch(() => {
      // エラー表示は fetchGraph 内で更新する。
    });
  }, [fetchGraph]);

  useEffect(() => {
    void fetchGraph().catch(() => {
      // エラー表示は fetchGraph 内で更新する。
    });
  }, [fetchGraph]);

  const clearCurrentResults = useCallback(() => {
    setResults([]);
    setDisconnectedMemberIndexes([]);
    setSearchError(null);
    lastSearchRef.current = null;
  }, []);

  const canAttemptSearch = members.filter((member) => member.stationIndex !== null || member.text.trim()).length >= 2;

  const runSearch = useCallback(
    async (nextMode: SearchMode = mode) => {
      setIsSearching(true);
      setSearchError(null);

      try {
        let loaded;
        try {
          loaded = await fetchGraph();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'graph.json の読み込みに失敗しました';
          setSearchError(message);
          return;
        }
        const currentGraph = loaded.graph;
        const currentAdjacency = loaded.adjacency;

        if (!currentGraph || !currentAdjacency) {
          setSearchError('駅データの読み込み完了後にもう一度検索してください');
          return;
        }

        const validatedMembers = members.map((member) => {
          if (member.stationIndex !== null) {
            return { ...member, error: null };
          }
          const resolved = resolveUniqueStation(currentGraph, member.text);
          if (resolved) {
            return { ...member, text: resolved.station.n, stationIndex: resolved.stationIndex, error: null };
          }
          return { ...member, error: member.text.trim() ? '候補から駅を選択してください' : '駅を入力してください' };
        });

        const validStationIndexes = validatedMembers
          .map((member) => member.stationIndex)
          .filter((stationIndex): stationIndex is number => stationIndex !== null);

        setMembers(validatedMembers);
        if (validStationIndexes.length < 2 || validatedMembers.some((member) => member.error)) {
          setResults([]);
          setDisconnectedMemberIndexes([]);
          setSearchError('2人以上の駅を確定してください');
          return;
        }

        const result = findMeetingStations(
          currentGraph,
          currentAdjacency,
          validStationIndexes,
          nextMode,
          distanceCacheRef.current,
        );
        setResults(result.results);
        setDisconnectedMemberIndexes(result.disconnectedMemberIndexes);
        lastSearchRef.current = { key: validStationIndexes.join(','), memberStationIndexes: validStationIndexes };
      } finally {
        setIsSearching(false);
      }
    },
    [fetchGraph, members, mode],
  );

  const handleModeChange = useCallback(
    (nextMode: SearchMode) => {
      setMode(nextMode);
      if (lastSearchRef.current && graph && adjacency) {
        const result = findMeetingStations(
          graph,
          adjacency,
          lastSearchRef.current.memberStationIndexes,
          nextMode,
          distanceCacheRef.current,
        );
        setResults(result.results);
        setDisconnectedMemberIndexes(result.disconnectedMemberIndexes);
      }
    },
    [adjacency, graph],
  );

  const disconnectedWarnings = useMemo(() => {
    if (!graph) {
      return [];
    }
    const selected = members
      .map((member) => member.stationIndex)
      .filter((stationIndex): stationIndex is number => stationIndex !== null);
    return disconnectedMemberIndexes
      .map((memberIndex) => selected[memberIndex])
      .filter((stationIndex): stationIndex is number => stationIndex !== undefined)
      .map((stationIndex, index) => ({
        memberIndex: disconnectedMemberIndexes[index],
        stationName: graph.stations[stationIndex].n,
      }));
  }, [disconnectedMemberIndexes, graph, members]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>FairMeet</h1>
        <p>みんなの最寄駅から、ちょうどいい集合駅を見つける</p>
      </header>

      {loadError ? (
        <section className="banner error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={retryFetchGraph}>
            再試行
          </button>
        </section>
      ) : null}

      <section className="panel" aria-label="メンバー入力">
        <MemberList members={members} setMembers={setMembers} graph={graph} onChange={clearCurrentResults} />
      </section>

      <section className="panel compact" aria-label="探索モード">
        <ModeSelector value={mode} onChange={handleModeChange} />
      </section>

      <button
        className="search-button"
        type="button"
        onClick={() => void runSearch()}
        disabled={!canAttemptSearch || isSearching || Boolean(loadError)}
      >
        {isSearching || isLoadingGraph ? '計算中...' : '集合駅をさがす'}
      </button>

      {searchError ? (
        <p className="form-message" role="alert">
          {searchError}
        </p>
      ) : null}

      {disconnectedWarnings.map((warning) => (
        <p className="banner warning" role="alert" key={warning.memberIndex}>
          ⚠ {warning.stationName} は他のメンバーと鉄道がつながっていないため候補を計算できません
        </p>
      ))}

      <ResultList graph={graph} results={results} />

      <footer className="app-footer">
        <p>所要時間はダイヤを考慮しない概算です（駅間距離からの推定）</p>
        <p>
          駅・路線データ:{' '}
          <a href="https://github.com/Seo-4d696b75/station_database" target="_blank" rel="noreferrer">
            station_database (CC BY-SA 4.0)
          </a>
        </p>
      </footer>
    </main>
  );
}
