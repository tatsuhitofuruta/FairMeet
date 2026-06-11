import { dijkstra } from './dijkstra';
import { getStationAreaTier, STATION_AREA_TIER_SCORE_WINDOW_MINUTES } from './stationAreaTiers';
import type { AdjacencyList, GraphData, SearchMode, Station, StationAreaTierInfo } from './types';

export interface MemberTravelTime {
  stationIndex: number;
  minutes: number;
  roundedMinutes: number;
}

export interface MeetingCandidate {
  stationIndex: number;
  station: Station;
  areaTier: StationAreaTierInfo;
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

function sortByScoreThenStation(a: MeetingCandidate, b: MeetingCandidate): number {
  if (a.score !== b.score) {
    return a.score - b.score;
  }
  return a.stationIndex - b.stationIndex;
}

function applyAreaTierTieBreaks(candidates: MeetingCandidate[]): MeetingCandidate[] {
  const sortedByScore = [...candidates].sort(sortByScoreThenStation);
  const ranked: MeetingCandidate[] = [];

  for (let start = 0; start < sortedByScore.length;) {
    const baseScore = sortedByScore[start].score;
    let end = start + 1;
    while (
      end < sortedByScore.length &&
      sortedByScore[end].score - baseScore <= STATION_AREA_TIER_SCORE_WINDOW_MINUTES
    ) {
      end += 1;
    }

    ranked.push(
      ...sortedByScore.slice(start, end).sort((a, b) => {
        if (a.areaTier.tier !== b.areaTier.tier) {
          return b.areaTier.tier - a.areaTier.tier;
        }
        return sortByScoreThenStation(a, b);
      }),
    );
    start = end;
  }

  return ranked;
}

function isDuplicatePlace(graph: GraphData, aIndex: number, bIndex: number): boolean {
  const a = graph.stations[aIndex];
  const b = graph.stations[bIndex];
  const distanceKm = haversineKm(a, b);
  return distanceKm < 0.6 || (a.o === b.o && distanceKm <= 1.2);
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
      areaTier: getStationAreaTier(graph.stations[stationIndex]),
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

  const areaAwareRanked = applyAreaTierTieBreaks(ranked);

  const selected: MeetingCandidate[] = [];
  for (const candidate of areaAwareRanked) {
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
  distancesByMember: Float64Array[],
): number[] {
  const visited = new Set<number>();
  const groups: number[][] = [];

  for (let memberIndex = 0; memberIndex < memberStationIndexes.length; memberIndex += 1) {
    if (visited.has(memberIndex)) {
      continue;
    }

    const group: number[] = [];
    const queue = [memberIndex];
    visited.add(memberIndex);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) {
        continue;
      }
      group.push(current);

      for (let other = 0; other < memberStationIndexes.length; other += 1) {
        if (visited.has(other)) {
          continue;
        }
        if (Number.isFinite(distancesByMember[current]?.[memberStationIndexes[other]])) {
          visited.add(other);
          queue.push(other);
        }
      }
    }

    groups.push(group);
  }

  const reachableNodeCount = (memberIndex: number) => {
    const distances = distancesByMember[memberIndex];
    if (!distances) {
      return 0;
    }
    let count = 0;
    for (const distance of distances) {
      if (Number.isFinite(distance)) {
        count += 1;
      }
    }
    return count;
  };

  const groupReachableNodeCount = (group: number[]) => reachableNodeCount(group[0]);
  const groupMinMemberIndex = (group: number[]) => Math.min(...group);

  const majority = groups.reduce((best, group) => {
    if (group.length > best.length) {
      return group;
    }
    if (group.length < best.length) {
      return best;
    }

    const groupReachable = groupReachableNodeCount(group);
    const bestReachable = groupReachableNodeCount(best);
    if (groupReachable > bestReachable) {
      return group;
    }
    if (groupReachable < bestReachable) {
      return best;
    }

    if (groupMinMemberIndex(group) < groupMinMemberIndex(best)) {
      return group;
    }
    return best;
  }, groups[0] ?? []);
  const majoritySet = new Set(majority);

  return memberStationIndexes
    .map((_, memberIndex) => memberIndex)
    .filter((memberIndex) => !majoritySet.has(memberIndex));
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
      results.length === 0 ? detectDisconnectedMembers(memberStationIndexes, distancesByMember) : [],
  };
}
