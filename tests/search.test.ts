import { describe, expect, it } from 'vitest';
import { normalize, resolveUniqueStation, searchStations } from '../src/lib/search';
import type { GraphData } from '../src/lib/types';

const graph: GraphData = {
  version: 1,
  generatedAt: '2026-06-11T00:00:00.000Z',
  source: 'test',
  nodeCount: 0,
  lines: [{ n: '山手線', c: '#00aa00' }],
  edges: [],
  stations: [
    { c: 1, n: '新宿', o: '新宿', k: 'しんじゅく', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 2, n: '新宿三丁目', o: '新宿三丁目', k: 'しんじゅくさんちょうめ', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 3, n: '渋谷', o: '渋谷', k: 'しぶや', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 4, n: '品川', o: '品川', k: 'しながわ', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 5, n: '品川シーサイド', o: '品川シーサイド', k: 'しながわしーさいど', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 6, n: '白金台', o: '白金台', k: 'しろかねだい', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 7, n: '白金高輪', o: '白金高輪', k: 'しろかねたかなわ', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 8, n: '新橋', o: '新橋', k: 'しんばし', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 9, n: '神田', o: '神田', k: 'かんだ', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 10, n: '神楽坂', o: '神楽坂', k: 'かぐらざか', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 11, n: '新大久保', o: '新大久保', k: 'しんおおくぼ', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 12, n: '新井', o: '新井', k: 'あらい', p: 15, lat: 0, lng: 0, l: [0] },
    { c: 13, n: '新田', o: '新田', k: 'しんでん', p: 11, lat: 0, lng: 0, l: [0] },
    { c: 14, n: '新座', o: '新座', k: 'にいざ', p: 11, lat: 0, lng: 0, l: [0] },
    { c: 15, n: '新木場', o: '新木場', k: 'しんきば', p: 13, lat: 0, lng: 0, l: [0] },
    { c: 16, n: '新小岩', o: '新小岩', k: 'しんこいわ', p: 13, lat: 0, lng: 0, l: [0] },
  ],
};

describe('normalize', () => {
  it('normalizes width, case, and katakana to hiragana', () => {
    expect(normalize('シブヤＡ')).toBe('しぶやa');
  });
});

describe('searchStations', () => {
  it('matches kanji, hiragana, and katakana prefixes', () => {
    expect(searchStations(graph, '新').map((result) => result.station.n)).toContain('新宿');
    expect(searchStations(graph, 'しぶ').map((result) => result.station.n)).toEqual(['渋谷']);
    expect(searchStations(graph, 'シナ').map((result) => result.station.n)).toEqual(['品川', '品川シーサイド']);
  });

  it('prioritizes exact matches and limits results to 8', () => {
    const allPrefixResults = searchStations(graph, '新', 20);
    const limitedResults = searchStations(graph, '新');

    expect(searchStations(graph, '新宿').map((result) => result.station.n).slice(0, 2)).toEqual([
      '新宿',
      '新宿三丁目',
    ]);
    expect(allPrefixResults).toHaveLength(9);
    expect(limitedResults).toHaveLength(8);
  });
});

describe('resolveUniqueStation', () => {
  it('resolves only unique exact normalized matches', () => {
    expect(resolveUniqueStation(graph, 'シブヤ')?.station.n).toBe('渋谷');
    expect(resolveUniqueStation(graph, '新')).toBeNull();
  });
});
