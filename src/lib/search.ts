import type { GraphData, Station } from './types';

export const PREFECTURES = [
  '',
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
] as const;

export interface StationSearchResult {
  stationIndex: number;
  station: Station;
  prefectureName: string;
  representativeLineName: string;
}

interface SearchIndexEntry {
  stationIndex: number;
  station: Station;
  normalizedName: string;
  normalizedOriginalName: string;
  normalizedKana: string;
}

const searchIndexCache = new WeakMap<GraphData, SearchIndexEntry[]>();

export function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .trim();
}

export function getSearchIndex(graph: GraphData): SearchIndexEntry[] {
  const cached = searchIndexCache.get(graph);
  if (cached) {
    return cached;
  }

  const index = graph.stations.map((station, stationIndex) => ({
    station,
    stationIndex,
    normalizedName: normalize(station.n),
    normalizedOriginalName: normalize(station.o),
    normalizedKana: normalize(station.k),
  }));
  searchIndexCache.set(graph, index);
  return index;
}

function startsWithQuery(entry: SearchIndexEntry, query: string): boolean {
  return (
    entry.normalizedName.startsWith(query) ||
    entry.normalizedOriginalName.startsWith(query) ||
    entry.normalizedKana.startsWith(query)
  );
}

function isExactMatch(entry: SearchIndexEntry, query: string): boolean {
  return (
    entry.normalizedName === query ||
    entry.normalizedOriginalName === query ||
    entry.normalizedKana === query
  );
}

export function searchStations(graph: GraphData, input: string, limit = 8): StationSearchResult[] {
  const query = normalize(input);
  if (!query) {
    return [];
  }

  return getSearchIndex(graph)
    .filter((entry) => startsWithQuery(entry, query))
    .map((entry) => ({ ...entry, exact: isExactMatch(entry, query) }))
    .sort((a, b) => {
      if (a.exact !== b.exact) {
        return a.exact ? -1 : 1;
      }
      if (a.station.n.length !== b.station.n.length) {
        return a.station.n.length - b.station.n.length;
      }
      return a.stationIndex - b.stationIndex;
    })
    .slice(0, limit)
    .map(({ station, stationIndex }) => ({
      station,
      stationIndex,
      prefectureName: PREFECTURES[station.p] ?? '',
      representativeLineName: graph.lines[station.l[0]]?.n ?? '',
    }));
}

export function resolveUniqueStation(graph: GraphData, input: string): StationSearchResult | null {
  const query = normalize(input);
  if (!query) {
    return null;
  }

  const matches = getSearchIndex(graph).filter((entry) => isExactMatch(entry, query));

  if (matches.length !== 1) {
    return null;
  }

  const [{ station, stationIndex }] = matches;
  return {
    station,
    stationIndex,
    prefectureName: PREFECTURES[station.p] ?? '',
    representativeLineName: graph.lines[station.l[0]]?.n ?? '',
  };
}
