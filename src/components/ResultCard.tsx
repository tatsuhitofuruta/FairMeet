import { PREFECTURES } from '../lib/search';
import type { MeetingCandidate } from '../lib/scoring';
import type { GraphData } from '../lib/types';

interface ResultCardProps {
  graph: GraphData;
  result: MeetingCandidate;
  rank: number;
}

export function ResultCard({ graph, result, rank }: ResultCardProps) {
  const station = result.station;
  const lines = station.l.map((lineIndex) => graph.lines[lineIndex]).filter(Boolean);
  const visibleLines = lines.slice(0, 5);
  const remainingLineCount = Math.max(0, lines.length - visibleLines.length);
  const maxTime = Math.max(1, ...result.times.map((time) => time.minutes));
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;

  return (
    <article className="result-card">
      <div className="result-heading">
        <span className="rank">{rank}</span>
        <div>
          <h2>{station.n}</h2>
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
        <span>
          最大 {Math.round(result.max)}分 / 平均 {Math.round(result.mean)}分
        </span>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
          Googleマップ
        </a>
      </footer>
    </article>
  );
}
