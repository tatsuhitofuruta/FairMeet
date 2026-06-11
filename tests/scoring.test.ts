import { describe, expect, it } from 'vitest';
import { detectDisconnectedMembers, scoreCandidates } from '../src/lib/scoring';
import type { GraphData } from '../src/lib/types';

function graphFixture(): GraphData {
  return {
    version: 1,
    generatedAt: '2026-06-11T00:00:00.000Z',
    source: 'test',
    nodeCount: 5,
    lines: [{ n: 'テスト線', c: null }],
    edges: [],
    stations: [
      { c: 1, n: 'A', o: 'A', k: 'えー', p: 13, lat: 35.68, lng: 139.76, l: [0] },
      { c: 2, n: 'B', o: 'B', k: 'びー', p: 13, lat: 35.9, lng: 139.76, l: [0] },
      { c: 3, n: 'C', o: 'C', k: 'しー', p: 13, lat: 36.1, lng: 139.76, l: [0] },
      { c: 4, n: 'C別駅', o: 'C', k: 'しーべつ', p: 13, lat: 36.1005, lng: 139.7605, l: [0] },
      { c: 5, n: 'D', o: 'D', k: 'でぃー', p: 13, lat: 36.5, lng: 139.76, l: [0] },
    ],
  };
}

describe('scoreCandidates', () => {
  it('prefers the lower maximum travel time in fair mode', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([0, 200, 300, 310, 700]),
        Float64Array.from([300, 200, 0, 10, 700]),
      ],
      'fair',
    );

    expect(results[0].station.n).toBe('B');
    expect(results[0].max).toBe(20);
  });

  it('deduplicates stations with the same original_name or near-identical coordinates', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([0, 200, 300, 301, 600]),
        Float64Array.from([300, 200, 0, 1, 600]),
      ],
      'total',
    );

    expect(results.map((result) => result.station.n)).toContain('C');
    expect(results.map((result) => result.station.n)).not.toContain('C別駅');
  });

  it('excludes candidates that any member cannot reach', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([0, 200, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 600]),
        Float64Array.from([Number.POSITIVE_INFINITY, 200, 0, 1, 600]),
      ],
      'balanced',
    );

    expect(results.map((result) => result.station.n)).toEqual(['B', 'D']);
  });
});

describe('detectDisconnectedMembers', () => {
  it('reports members whose start stations are unreachable from member 1', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2],
      Float64Array.from([0, Number.POSITIVE_INFINITY, 100]),
    );

    expect(disconnected).toEqual([1]);
  });
});
