import { dijkstra } from './dijkstra';
import type { AdjacencyList, GraphData, SearchMode, Station } from './types';

export interface MemberTravelTime {
  stationIndex: number;
  minutes: number;
  roundedMinutes: number;
}

export interface MeetingCandidate {
  stationIndex: number;
  station: Station;
  times: MemberTravelTime[];
  max: number;
  mean: number;
  score: number;
}

export interface MeetingSearchResult {
  results: MeetingCandidate[];
  disconnectedMemberIndexes: number[];
}

function haversineKm(a: Station, b: Station): number {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function calculateScore(times: number[], mode: SearchMode): number {
  const max = Math.max(...times);
  const min = Math.min(...times);
  const mean = times.reduce((sum, value) => sum + value, 0) / times.length;

  if (mode === 'balanced') {
    return mean + 0.5 * (max - min);
  }
  if (mode === 'total') {
    return mean;
  }
  return max + 0.1 * mean;
}

function isDuplicatePlace(graph: GraphData, aIndex: number, bIndex: number): boolean {
  const a = graph.stations[aIndex];
  const b = graph.stations[bIndex];
  return a.o === b.o || haversineKm(a, b) < 0.6;
}

export function scoreCandidates(
  graph: GraphData,
  memberStationIndexes: number[],
  distancesByMember: Float64Array[],
  mode: SearchMode,
): MeetingCandidate[] {
  const ranked: MeetingCandidate[] = [];

  for (let stationIndex = 0; stationIndex < graph.stations.length; stationIndex += 1) {
    const rawTimes = distancesByMember.map((distances) => distances[stationIndex]);
    if (rawTimes.some((time) => !Number.isFinite(time))) {
      continue;
    }

    const minutes = rawTimes.map((time) => time / 10);
    const max = Math.max(...minutes);
    const mean = minutes.reduce((sum, value) => sum + value, 0) / minutes.length;

    ranked.push({
      stationIndex,
      station: graph.stations[stationIndex],
      times: minutes.map((time, index) => ({
        stationIndex: memberStationIndexes[index],
        minutes: time,
        roundedMinutes: Math.round(time),
      })),
      max,
      mean,
      score: calculateScore(minutes, mode),
    });
  }

  ranked.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.stationIndex - b.stationIndex;
  });

  const selected: MeetingCandidate[] = [];
  for (const candidate of ranked) {
    if (selected.some((picked) => isDuplicatePlace(graph, picked.stationIndex, candidate.stationIndex))) {
      continue;
    }
    selected.push(candidate);
    if (selected.length === 5) {
      break;
    }
  }

  return selected;
}

export function detectDisconnectedMembers(
  memberStationIndexes: number[],
  distancesFromFirst: Float64Array,
): number[] {
  return memberStationIndexes
    .map((stationIndex, memberIndex) => ({ stationIndex, memberIndex }))
    .filter(({ memberIndex, stationIndex }) => memberIndex > 0 && !Number.isFinite(distancesFromFirst[stationIndex]))
    .map(({ memberIndex }) => memberIndex);
}

export function findMeetingStations(
  graph: GraphData,
  adjacency: AdjacencyList,
  memberStationIndexes: number[],
  mode: SearchMode,
  distanceCache = new Map<number, Float64Array>(),
): MeetingSearchResult {
  const distancesByMember = memberStationIndexes.map((stationIndex) => {
    const cached = distanceCache.get(stationIndex);
    if (cached) {
      return cached;
    }
    const distances = dijkstra(adjacency, stationIndex);
    distanceCache.set(stationIndex, distances);
    return distances;
  });

  const results = scoreCandidates(graph, memberStationIndexes, distancesByMember, mode);
  return {
    results,
    disconnectedMemberIndexes:
      results.length === 0 ? detectDisconnectedMembers(memberStationIndexes, distancesByMember[0]) : [],
  };
}
