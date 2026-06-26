import { useState } from 'react';
import { mapSearchCategories, stationCategoryMapUrl, stationMapUrl } from '../lib/maps';
import { PREFECTURES } from '../lib/search';
import { explainCandidateScore, type MeetingCandidate } from '../lib/scoring';
import {
  fetchTransitPlan,
  stationTransitEndpoint,
  summarizeTransitPlan,
  type TransitRouteSummary,
} from '../lib/transitApi';
import type { GraphData, SearchMode } from '../lib/types';

interface ResultCardProps {
  graph: GraphData;
  result: MeetingCandidate;
  rank: number;
  mode: SearchMode;
}

interface ActualRouteResult {
  stationIndex: number;
  stationName: string;
  summary?: TransitRouteSummary;
  error?: string;
}

interface ActualRouteState {
  status: 'idle' | 'loading' | 'ready';
  routes: ActualRouteResult[];
}

export function ResultCard({ graph, result, rank, mode }: ResultCardProps) {
  const [actualRouteState, setActualRouteState] = useState<ActualRouteState>({ status: 'idle', routes: [] });
  const station = result.station;
  const lines = station.l.map((lineIndex) => graph.lines[lineIndex]).filter(Boolean);
  const visibleLines = lines.slice(0, 5);
  const remainingLineCount = Math.max(0, lines.length - visibleLines.length);
  const maxTime = Math.max(1, ...result.times.map((time) => time.minutes));
  const prefectureName = PREFECTURES[station.p] ?? '';
  const mapUrl = stationMapUrl(station);

  const checkActualRoutes = async () => {
    setActualRouteState({ status: 'loading', routes: [] });

    const routes: ActualRouteResult[] = [];

    for (const time of result.times) {
      const startStation = graph.stations[time.stationIndex];
      let route: ActualRouteResult;

      if (time.stationIndex === result.stationIndex) {
        route = {
          stationIndex: time.stationIndex,
          stationName: startStation.n,
          summary: {
            durationMinutes: 0,
            transferCount: 0,
            departureLabel: '--:--',
            arrivalLabel: '--:--',
            routeNames: ['同じ駅'],
          },
        };
      } else {
        try {
          const plan = await fetchTransitPlan({
            from: stationTransitEndpoint(startStation),
            to: stationTransitEndpoint(station),
            fromLabel: startStation.n,
            toLabel: station.n,
            type: 'departure',
            allowModes: 'rail',
            avoidModes: 'bus,air,ferry',
            maxTransfers: 6,
            numItineraries: 1,
          });
          const summary = summarizeTransitPlan(plan);
          if (!summary) {
            throw new Error('Transit API returned no journeys');
          }

          route = {
            stationIndex: time.stationIndex,
            stationName: startStation.n,
            summary,
          };
        } catch {
          route = {
            stationIndex: time.stationIndex,
            stationName: startStation.n,
            error: 'Transit APIで実ルートを取得できませんでした',
          };
        }
      }

      routes.push(route);
      setActualRouteState({ status: 'loading', routes: [...routes] });
    }

    setActualRouteState({ status: 'ready', routes });
  };

  return (
    <article className="result-card">
      <div className="result-heading">
        <span className="rank">{rank}</span>
        <div>
          <div className="station-title-row">
            <h2>{station.n}</h2>
            {result.areaTier.source !== 'unlisted-default' ? (
              <span className="area-tier-badge" title={result.areaTier.summary}>
                栄え度 {result.areaTier.grade}
              </span>
            ) : null}
          </div>
          <p>{PREFECTURES[station.p]}</p>
        </div>
      </div>

      <div className="line-chips" aria-label="乗り入れ路線">
        {visibleLines.map((line) => (
          <span
            className="line-chip"
            key={line.n}
            style={{ backgroundColor: line.c ?? '#e4e8ef', color: line.c ? '#ffffff' : '#2d3748' }}
          >
            {line.n}
          </span>
        ))}
        {remainingLineCount > 0 ? <span className="line-chip muted">他{remainingLineCount}路線</span> : null}
      </div>

      <div className="time-list">
        {result.times.map((time, index) => {
          const startStation = graph.stations[time.stationIndex];
          const width = `${Math.max(4, (time.minutes / maxTime) * 100)}%`;
          return (
            <div className="time-row" key={`${time.stationIndex}-${index}`}>
              <div className="time-label">
                <span>{startStation.n}から</span>
                <strong>{time.roundedMinutes}分</strong>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar-fill" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="actual-route-check">
        <button type="button" onClick={() => void checkActualRoutes()} disabled={actualRouteState.status === 'loading'}>
          {actualRouteState.status === 'loading' ? '実ルート確認中...' : '実ルート確認'}
        </button>
      </div>

      {actualRouteState.status !== 'idle' ? (
        <div className="actual-routes" aria-live="polite">
          {actualRouteState.status === 'loading' ? <p>Transit APIで確認しています</p> : null}
          {actualRouteState.routes.length > 0
            ? actualRouteState.routes.map((route) => (
                <div className="actual-route-row" key={route.stationIndex}>
                  <span className="actual-route-origin">{route.stationName}から</span>
                  {route.summary ? (
                    <span className="actual-route-detail">
                      {route.summary.durationMinutes}分 / 乗換{route.summary.transferCount}回 /{' '}
                      {route.summary.departureLabel}発 → {route.summary.arrivalLabel}着
                      <span className="actual-route-lines">{route.summary.routeNames.join('、')}</span>
                    </span>
                  ) : (
                    <span className="actual-route-error">{route.error}</span>
                  )}
                </div>
              ))
            : null}
        </div>
      ) : null}

      <footer className="result-footer">
        <div className="result-summary">
          <span>
            最大 {Math.round(result.max)}分 / 平均 {Math.round(result.mean)}分 / 負担差 {Math.round(result.range)}分
          </span>
          <span className="score-explanation">{explainCandidateScore(result, mode)}</span>
        </div>
        <div className="map-links" aria-label={`${station.n}駅周辺のGoogleマップ検索`}>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer">
            地図
          </a>
          {mapSearchCategories.map((category) => (
            <a
              href={stationCategoryMapUrl(station, category)}
              target="_blank"
              rel="noopener noreferrer"
              key={category}
            >
              {category}
            </a>
          ))}
        </div>
      </footer>
    </article>
  );
}
