import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAdjacencyList } from '../src/lib/graph';
import { findMeetingStations } from '../src/lib/scoring';
import { normalize } from '../src/lib/search';
import type { GraphData } from '../src/lib/types';

const graphPath = join(process.cwd(), 'public', 'data', 'graph.json');

function stationIndexByName(graph: GraphData, name: string, prefectureCode?: number): number {
  const query = normalize(name);
  const matches = graph.stations
    .map((station, index) => ({ station, index }))
    .filter(({ station }) => normalize(station.n) === query || normalize(station.o) === query);
  const filteredMatches =
    prefectureCode === undefined
      ? matches
      : matches.filter(({ station }) => station.p === prefectureCode);

  if (filteredMatches.length === 0) {
    throw new Error(`${name} が graph.json に見つかりません`);
  }
  if (filteredMatches.length > 1) {
    throw new Error(`${name} が複数見つかりました。prefectureCode を指定してください`);
  }
  return filteredMatches[0].index;
}

describe('generated graph integration smoke', () => {
  it.skipIf(!existsSync(graphPath))('returns plausible candidates for Shibuya, Omiya, and Yokohama', () => {
    const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as GraphData;
    const adjacency = buildAdjacencyList(graph);
    const members = [
      stationIndexByName(graph, '渋谷'),
      stationIndexByName(graph, '大宮', 11),
      stationIndexByName(graph, '横浜'),
    ];

    const result = findMeetingStations(graph, adjacency, members, 'fair');

    expect(result.results).toHaveLength(5);
    expect(result.results.every((candidate) => candidate.max < 120)).toBe(true);
  });

  it.skipIf(!existsSync(graphPath))('detects disconnected members for Naha Airport and Tokyo', () => {
    const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as GraphData;
    const adjacency = buildAdjacencyList(graph);
    const members = [stationIndexByName(graph, '那覇空港'), stationIndexByName(graph, '東京')];

    const result = findMeetingStations(graph, adjacency, members, 'fair');

    expect(result.results).toHaveLength(0);
    expect(result.disconnectedMemberIndexes).toEqual([1]);
  });

  it.skipIf(!existsSync(graphPath))('detects disconnected members for Tokyo and Naha Airport', () => {
    const graph = JSON.parse(readFileSync(graphPath, 'utf8')) as GraphData;
    const adjacency = buildAdjacencyList(graph);
    const members = [stationIndexByName(graph, '東京'), stationIndexByName(graph, '那覇空港')];

    const result = findMeetingStations(graph, adjacency, members, 'fair');

    expect(result.results).toHaveLength(0);
    expect(result.disconnectedMemberIndexes).toEqual([1]);
  });
});
