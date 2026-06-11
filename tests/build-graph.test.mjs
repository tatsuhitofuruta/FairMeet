import { describe, expect, it } from 'vitest';
import { buildGraph, rideWeightTenths } from '../scripts/build-graph.mjs';

const rawStations = [
  {
    code: 1,
    name: 'A駅',
    original_name: 'A駅',
    name_kana: 'えー',
    closed: false,
    lat: 35,
    lng: 139,
    prefecture: 13,
    lines: [10],
  },
  {
    code: 2,
    name: 'B駅',
    original_name: 'B駅',
    name_kana: 'びー',
    closed: false,
    lat: 35,
    lng: 139.01,
    prefecture: 13,
    lines: [10, 20],
  },
  {
    code: 3,
    name: 'C駅',
    original_name: 'C駅',
    name_kana: 'しー',
    closed: false,
    lat: 35,
    lng: 139.02,
    prefecture: 13,
    lines: [20],
  },
  {
    code: 4,
    name: 'D駅',
    original_name: 'D駅',
    name_kana: 'でぃー',
    closed: false,
    lat: 35.001,
    lng: 139,
    prefecture: 13,
    lines: [30],
  },
  {
    code: 5,
    name: '廃駅',
    original_name: '廃駅',
    name_kana: 'はい',
    closed: true,
    lat: 35,
    lng: 139,
    prefecture: 13,
    lines: [10],
  },
];

const rawLines = [
  { code: 10, name: 'A線', closed: false, color: '#111111' },
  { code: 20, name: 'B線', closed: false, color: '#222222' },
  { code: 30, name: 'C線', closed: false, color: null },
  { code: 40, name: '廃線', closed: true, color: null },
];

const lineDetails = {
  10: { station_list: [1, 2, 5] },
  20: { station_list: [2, 3] },
  30: { station_list: [4] },
  40: { station_list: [1, 3] },
};

describe('buildGraph', () => {
  it('generates hub, spoke, ride, and walking edges from mini fixtures', () => {
    const { graph, stats } = buildGraph(rawStations, rawLines, lineDetails);

    expect(graph.stations).toHaveLength(4);
    expect(graph.lines).toHaveLength(3);
    expect(graph.nodeCount).toBe(9);
    expect(stats).toEqual({ rideEdges: 2, hubEdges: 5, walkingEdges: 1 });
    expect(graph.edges).toHaveLength(8);
    expect(graph.edges.filter((edge) => edge[2] === 25)).toHaveLength(5);
  });

  it('uses the documented ride weight formula and skips abnormal adjacent pairs', () => {
    const closeWeight = rideWeightTenths(rawStations[0], rawStations[1], 'A線');
    const abnormalWeight = rideWeightTenths(
      { lat: 35, lng: 139 },
      { lat: 36, lng: 140 },
      'A線',
    );

    expect(closeWeight).toBeGreaterThan(5);
    expect(abnormalWeight).toBeNull();
  });
});
