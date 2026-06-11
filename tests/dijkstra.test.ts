import { describe, expect, it } from 'vitest';
import { dijkstra } from '../src/lib/dijkstra';
import type { AdjacencyList } from '../src/lib/types';

describe('dijkstra', () => {
  it('finds shortest distances and leaves disconnected nodes unreachable', () => {
    const adjacency: AdjacencyList = [
      [
        { to: 1, weight: 10 },
        { to: 2, weight: 50 },
      ],
      [
        { to: 0, weight: 10 },
        { to: 2, weight: 15 },
      ],
      [
        { to: 0, weight: 50 },
        { to: 1, weight: 15 },
      ],
      [],
    ];

    const distances = dijkstra(adjacency, 0);

    expect(Array.from(distances.slice(0, 3))).toEqual([0, 10, 25]);
    expect(Number.isFinite(distances[3])).toBe(false);
  });
});
