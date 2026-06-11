import { describe, expect, it } from 'vitest';
import { validateMembersForSearch } from '../src/App';
import type { GraphData } from '../src/lib/types';

const graph: GraphData = {
  version: 1,
  generatedAt: '2026-06-11T00:00:00.000Z',
  source: 'test',
  nodeCount: 3,
  lines: [{ n: 'テスト線', c: null }],
  edges: [],
  stations: [
    { c: 1, n: '渋谷', o: '渋谷', k: 'しぶや', p: 13, lat: 35.658, lng: 139.701, l: [0] },
    { c: 2, n: '横浜', o: '横浜', k: 'よこはま', p: 14, lat: 35.466, lng: 139.622, l: [0] },
    { c: 3, n: '東京', o: '東京', k: 'とうきょう', p: 13, lat: 35.681, lng: 139.767, l: [0] },
  ],
};

describe('validateMembersForSearch', () => {
  it('allows two confirmed stations with an empty row', () => {
    const result = validateMembersForSearch(
      [
        { id: 1, text: '渋谷', stationIndex: 0, error: null },
        { id: 2, text: '横浜', stationIndex: 1, error: null },
        { id: 3, text: '', stationIndex: null, error: null },
      ],
      graph,
    );

    expect(result.canSearch).toBe(true);
    expect(result.stationIndexes).toEqual([0, 1]);
    expect(result.validatedMembers[2].error).toBeNull();
  });

  it('blocks two confirmed stations plus invalid free text with only that row marked', () => {
    const result = validateMembersForSearch(
      [
        { id: 1, text: '渋谷', stationIndex: 0, error: null },
        { id: 2, text: '横浜', stationIndex: 1, error: null },
        { id: 3, text: '存在しない駅', stationIndex: null, error: null },
      ],
      graph,
    );

    expect(result.canSearch).toBe(false);
    expect(result.hasErrors).toBe(true);
    expect(result.validatedMembers.map((member) => member.error)).toEqual([
      null,
      null,
      '候補から駅を選択してください',
    ]);
  });

  it('blocks one confirmed station plus an empty row because fewer than two stations are confirmed', () => {
    const result = validateMembersForSearch(
      [
        { id: 1, text: '渋谷', stationIndex: 0, error: null },
        { id: 2, text: '', stationIndex: null, error: null },
      ],
      graph,
    );

    expect(result.canSearch).toBe(false);
    expect(result.hasErrors).toBe(false);
    expect(result.stationIndexes).toEqual([0]);
  });

  it('auto-confirms two exact free-text station names', () => {
    const result = validateMembersForSearch(
      [
        { id: 1, text: '渋谷', stationIndex: null, error: null },
        { id: 2, text: 'とうきょう', stationIndex: null, error: null },
      ],
      graph,
    );

    expect(result.canSearch).toBe(true);
    expect(result.stationIndexes).toEqual([0, 2]);
    expect(result.validatedMembers.map((member) => member.text)).toEqual(['渋谷', '東京']);
  });
});
