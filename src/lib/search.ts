import type { GraphData, Station } from './types';

export const PREFECTURES = [
  '',
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
] as const;

export interface StationSearchResult {
  stationIndex: number;
  station: Station;
  prefectureName: string;
  representativeLineName: string;
}

export function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .trim();
}

function startsWithQuery(station: Station, query: string): boolean {
  return (
    normalize(station.n).startsWith(query) ||
    normalize(station.o).startsWith(query) ||
    normalize(station.k).startsWith(query)
  );
}

export function searchStations(graph: GraphData, input: string, limit = 8): StationSearchResult[] {
  const query = normalize(input);
  if (!query) {
    return [];
  }

  return graph.stations
    .map((station, stationIndex) => ({ station, stationIndex }))
    .filter(({ station }) => startsWithQuery(station, query))
    .sort((a, b) => {
      const aExact = normalize(a.station.n) === query || normalize(a.station.o) === query || normalize(a.station.k) === query;
      const bExact = normalize(b.station.n) === query || normalize(b.station.o) === query || normalize(b.station.k) === query;
      if (aExact !== bExact) {
        return aExact ? -1 : 1;
      }
      if (a.station.n.length !== b.station.n.length) {
        return a.station.n.length - b.station.n.length;
      }
      return a.stationIndex - b.stationIndex;
    })
    .slice(0, limit)
    .map(({ station, stationIndex }) => ({
      station,
      stationIndex,
      prefectureName: PREFECTURES[station.p] ?? '',
      representativeLineName: graph.lines[station.l[0]]?.n ?? '',
    }));
}

export function resolveUniqueStation(graph: GraphData, input: string): StationSearchResult | null {
  const query = normalize(input);
  if (!query) {
    return null;
  }

  const matches = graph.stations
    .map((station, stationIndex) => ({ station, stationIndex }))
    .filter(({ station }) => normalize(station.n) === query || normalize(station.o) === query || normalize(station.k) === query);

  if (matches.length !== 1) {
    return null;
  }

  const [{ station, stationIndex }] = matches;
  return {
    station,
    stationIndex,
    prefectureName: PREFECTURES[station.p] ?? '',
    representativeLineName: graph.lines[station.l[0]]?.n ?? '',
  };
}
