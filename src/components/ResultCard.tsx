import { mapSearchCategories, stationCategoryMapUrl, stationMapUrl } from '../lib/maps';
import { PREFECTURES } from '../lib/search';
import { explainCandidateScore, type MeetingCandidate } from '../lib/scoring';
import type { GraphData, SearchMode } from '../lib/types';

interface ResultCardProps {
  graph: GraphData;
  result: MeetingCandidate;
  rank: number;
  mode: SearchMode;
}

export function ResultCard({ graph, result, rank, mode }: ResultCardProps) {
  const station = result.station;
  const lines = station.l.map((lineIndex) => graph.lines[lineIndex]).filter(Boolean);
  const visibleLines = lines.slice(0, 5);
  const remainingLineCount = Math.max(0, lines.length - visibleLines.length);
  const maxTime = Math.max(1, ...result.times.map((time) => time.minutes));
  const prefectureName = PREFECTURES[station.p] ?? '';
  const mapUrl = stationMapUrl(station);

  return (
    <article className="result-card">
      <div className="result-heading">
        <span className="rank">{rank}</span>
        <div>
          <div className="station-title-row">
            <h2>{station.n}</h2>
            {result.areaTier.tier > 0 ? (
              <span className="area-tier-badge" title={result.areaTier.summary}>
                栄え度 {result.areaTier.tier}
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
              href={stationCategoryMapUrl(station, prefectureName, category)}
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
