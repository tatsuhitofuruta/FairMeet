import { describe, expect, it } from 'vitest';
import { buildAdjacencyList } from '../src/lib/graph';
import type { GraphData } from '../src/lib/types';

describe('buildAdjacencyList', () => {
  it('builds an undirected adjacency list from compact edge tuples', () => {
    const graph: GraphData = {
      version: 1,
      generatedAt: '2026-06-11T00:00:00.000Z',
      source: 'test',
      nodeCount: 3,
      stations: [],
      lines: [],
      edges: [
        [0, 1, 25],
        [1, 2, 40],
      ],
    };

    expect(buildAdjacencyList(graph)).toEqual([
      [{ to: 1, weight: 25 }],
      [
        { to: 0, weight: 25 },
        { to: 2, weight: 40 },
      ],
      [{ to: 1, weight: 40 }],
    ]);
  });
});
