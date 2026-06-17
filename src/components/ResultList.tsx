import { ResultCard } from './ResultCard';
import type { MeetingCandidate } from '../lib/scoring';
import type { GraphData, SearchMode } from '../lib/types';

interface ResultListProps {
  graph: GraphData | null;
  results: MeetingCandidate[];
  mode: SearchMode;
}

export function ResultList({ graph, results, mode }: ResultListProps) {
  if (!graph || results.length === 0) {
    return null;
  }

  return (
    <section className="results" aria-label="候補駅">
      {results.map((result, index) => (
        <ResultCard graph={graph} result={result} rank={index + 1} mode={mode} key={result.stationIndex} />
      ))}
    </section>
  );
}
