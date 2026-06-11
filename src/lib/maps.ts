import type { Station } from './types';

export const mapSearchCategories = ['飲食店', 'カフェ', '居酒屋'] as const;

export type MapSearchCategory = (typeof mapSearchCategories)[number];

function googleMapsSearchUrl(query: string): string {
  const params = new URLSearchParams({ api: '1', query });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function stationMapUrl(station: Station): string {
  return googleMapsSearchUrl(`${station.lat},${station.lng}`);
}

export function stationCategoryMapUrl(station: Station, prefectureName: string, category: MapSearchCategory): string {
  return googleMapsSearchUrl(`${category} ${station.n}駅 ${prefectureName}`);
}
