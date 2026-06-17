import { describe, expect, it } from 'vitest';
import { detectDisconnectedMembers, explainCandidateScore, scoreCandidates } from '../src/lib/scoring';
import type { GraphData } from '../src/lib/types';

function graphFixture(): GraphData {
  return {
    version: 1,
    generatedAt: '2026-06-11T00:00:00.000Z',
    source: 'test',
    nodeCount: 6,
    lines: [{ n: 'テスト線', c: null }],
    edges: [],
    stations: [
      { c: 1, n: 'A', o: 'A', k: 'えー', p: 13, lat: 35.68, lng: 139.76, l: [0] },
      { c: 1130205, n: 'B', o: 'B', k: 'びー', p: 13, lat: 35.9, lng: 139.76, l: [0] },
      { c: 3, n: 'C', o: 'C', k: 'しー', p: 13, lat: 36.1, lng: 139.76, l: [0] },
      { c: 4, n: 'C別駅', o: 'C', k: 'しーべつ', p: 13, lat: 36.1005, lng: 139.7605, l: [0] },
      { c: 5, n: 'D', o: 'D', k: 'でぃー', p: 13, lat: 36.5, lng: 139.76, l: [0] },
      { c: 6, n: 'C遠隔', o: 'C', k: 'しーえんかく', p: 1, lat: 43.1, lng: 141.3, l: [0] },
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
        Float64Array.from([0, 200, 300, 310, 700, 800]),
        Float64Array.from([300, 200, 0, 10, 700, 800]),
      ],
      'fair',
    );

    expect(results[0].station.n).toBe('B');
    expect(results[0].max).toBe(20);
  });

  it('includes the minimum travel time and travel time gap for result explanations', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2, 4],
      [
        Float64Array.from([500, 100, 500, 500, 500, 500]),
        Float64Array.from([500, 200, 500, 500, 500, 500]),
        Float64Array.from([500, 300, 500, 500, 500, 500]),
      ],
      'balanced',
    );

    expect(results[0].station.n).toBe('B');
    expect(results[0].min).toBe(10);
    expect(results[0].max).toBe(30);
    expect(results[0].mean).toBe(20);
    expect(results[0].range).toBe(20);
  });

  it('uses area tier as a tie-breaker for candidates inside the score window', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([100, 120, 500, 500, 200, 500]),
        Float64Array.from([100, 120, 500, 500, 200, 500]),
      ],
      'total',
    );

    expect(results[0].station.n).toBe('B');
    expect(results[0].areaTier.tier).toBe(4);
    expect(results[0].score).toBe(12);
  });

  it('does not let area tier override candidates outside the score window', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([100, 140, 500, 500, 200, 500]),
        Float64Array.from([100, 140, 500, 500, 200, 500]),
      ],
      'total',
    );

    expect(results[0].station.n).toBe('A');
    expect(results[1].station.n).toBe('B');
  });

  it('deduplicates stations with the same original_name or near-identical coordinates', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([0, 200, 300, 301, 600, 650]),
        Float64Array.from([300, 200, 0, 1, 600, 650]),
      ],
      'total',
    );

    expect(results.map((result) => result.station.n)).toContain('C');
    expect(results.map((result) => result.station.n)).not.toContain('C別駅');
  });

  it('does not deduplicate remote stations that share original_name', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([900, 800, 300, 301, 700, 320]),
        Float64Array.from([900, 800, 0, 1, 700, 320]),
      ],
      'total',
    );

    expect(results.map((result) => result.station.n)).toContain('C');
    expect(results.map((result) => result.station.n)).toContain('C遠隔');
  });

  it('excludes candidates that any member cannot reach', () => {
    const graph = graphFixture();
    const results = scoreCandidates(
      graph,
      [0, 2],
      [
        Float64Array.from([0, 200, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 600, Number.POSITIVE_INFINITY]),
        Float64Array.from([Number.POSITIVE_INFINITY, 200, 0, 1, 600, 700]),
      ],
      'balanced',
    );

    expect(results.map((result) => result.station.n)).toEqual(['B', 'D']);
  });
});

describe('explainCandidateScore', () => {
  const candidate = {
    max: 31.4,
    mean: 20.2,
    range: 13.7,
  };

  it('explains the fair mode score with the maximum time and travel time gap', () => {
    expect(explainCandidateScore(candidate, 'fair')).toBe('公平重視: 最長31分と負担差14分を抑える評価です');
  });

  it('explains the balanced mode score with the mean time and travel time gap', () => {
    expect(explainCandidateScore(candidate, 'balanced')).toBe(
      'バランス: 平均20分と負担差14分の両方を見る評価です',
    );
  });

  it('explains the total mode score with the mean time and travel time gap', () => {
    expect(explainCandidateScore(candidate, 'total')).toBe('合計重視: 平均20分を抑える評価です（負担差14分）');
  });
});

describe('detectDisconnectedMembers', () => {
  it('reports the first member when the first member is the isolated minority', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2],
      [
        Float64Array.from([0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([Number.POSITIVE_INFINITY, 0, 100]),
        Float64Array.from([Number.POSITIVE_INFINITY, 100, 0]),
      ],
    );

    expect(disconnected).toEqual([0]);
  });

  it('reports an isolated middle member', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2],
      [
        Float64Array.from([0, Number.POSITIVE_INFINITY, 100]),
        Float64Array.from([Number.POSITIVE_INFINITY, 0, Number.POSITIVE_INFINITY]),
        Float64Array.from([100, Number.POSITIVE_INFINITY, 0]),
      ],
    );

    expect(disconnected).toEqual([1]);
  });

  it('reports a disconnected multi-member minority group', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2, 3, 4],
      [
        Float64Array.from([0, 100, 100, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([100, 0, 100, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([100, 100, 0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0, 100]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 100, 0]),
      ],
    );

    expect(disconnected).toEqual([3, 4]);
  });

  it('uses the smallest member index when member count and reachable node count are tied', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2, 3],
      [
        Float64Array.from([0, 100, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([100, 0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0, 100]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 100, 0]),
      ],
    );

    expect(disconnected).toEqual([2, 3]);
  });

  it('uses the group with more reachable nodes when member counts are tied', () => {
    const disconnected = detectDisconnectedMembers(
      [0, 1, 2, 3],
      [
        Float64Array.from([0, 100, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([100, 0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0, 100, 120, 140]),
        Float64Array.from([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 100, 0, 120, 140]),
      ],
    );

    expect(disconnected).toEqual([0, 1]);
  });
});
