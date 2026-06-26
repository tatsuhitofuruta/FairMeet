import { describe, expect, it } from 'vitest';
import { mapSearchCategories, stationCategoryMapUrl, stationMapUrl } from '../src/lib/maps';
import type { Station } from '../src/lib/types';

const station: Station = {
  c: 1,
  n: '東京',
  o: '東京',
  k: 'とうきょう',
  p: 13,
  lat: 35.681236,
  lng: 139.767125,
  l: [],
};

describe('stationMapUrl', () => {
  it('builds a Google Maps search URL for station coordinates', () => {
    expect(stationMapUrl(station)).toBe(
      'https://www.google.com/maps/search/?api=1&query=35.681236%2C139.767125',
    );
  });
});

describe('stationCategoryMapUrl', () => {
  it('builds category search URLs without API keys', () => {
    const url = stationCategoryMapUrl(station, '東京都', '飲食店');

    expect(url).toBe(
      'https://www.google.com/maps/search/?api=1&query=%E9%A3%B2%E9%A3%9F%E5%BA%97+near+%E6%9D%B1%E4%BA%AC%E9%A7%85+%E6%9D%B1%E4%BA%AC%E9%83%BD',
    );
    expect(url).not.toContain('key=');
  });

  it('keeps the free search categories small and explicit', () => {
    expect(mapSearchCategories).toEqual(['飲食店', 'カフェ', '居酒屋']);
  });
});
