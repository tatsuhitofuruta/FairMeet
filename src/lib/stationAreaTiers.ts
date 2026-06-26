import type { Station, StationAreaTier, StationAreaTierDefinition, StationAreaTierInfo } from './types';

export const STATION_AREA_TIER_VERSION = '2026-06-26-grade-v2';
export const STATION_AREA_TIER_SCORE_WINDOW_MINUTES = 3;

export const STATION_AREA_TIER_PRIMARY_SOURCE = {
  name: '国土数値情報 駅別乗降客数データ',
  url: 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2022.html',
  matchPolicy: '駅名、都道府県、緯度経度で station_database の station code に突合する',
} as const;

export const STATION_AREA_TIER_DEFINITIONS: Record<StationAreaTier, StationAreaTierDefinition> = {
  0: {
    tier: 0,
    grade: 'D',
    label: '控えめ',
    summary: '広域の集合候補としては控えめ。未登録駅の内部初期値にも使う',
  },
  1: {
    tier: 1,
    grade: 'C',
    label: '生活圏',
    summary: '日常利用の飲食店や店舗はあるが、広域の待ち合わせ候補としては控えめ',
  },
  2: {
    tier: 2,
    grade: 'B',
    label: '地域拠点',
    summary: '複数路線または駅前商業があり、近隣からの集合には使いやすい',
  },
  3: {
    tier: 3,
    grade: 'A',
    label: '広域拠点',
    summary: '商業・飲食・乗換利便性が高く、広域の集合候補になりやすい',
  },
  4: {
    tier: 4,
    grade: 'S',
    label: '主要繁華街',
    summary: '大規模ターミナルまたは代表的な繁華街で、店探しと待ち合わせの選択肢が厚い',
  },
};

interface ManualStationAreaTierEntry {
  tier: StationAreaTier;
  reason: string;
  updatedAt: string;
}

export const STATION_AREA_TIERS_BY_CODE: Partial<Record<number, ManualStationAreaTierEntry>> = {
  100201: { tier: 4, reason: '東京駅周辺の大規模商業・オフィス・飲食集積', updatedAt: '2026-06-11' },
  100202: { tier: 4, reason: '品川駅周辺の広域ターミナル性と飲食・商業集積', updatedAt: '2026-06-11' },
  100213: { tier: 4, reason: '名古屋駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  100216: { tier: 4, reason: '京都駅周辺の広域ターミナル性と商業集積', updatedAt: '2026-06-11' },
  100217: { tier: 3, reason: '新大阪駅周辺の広域交通結節点と飲食選択肢', updatedAt: '2026-06-11' },
  100312: { tier: 4, reason: '広島駅周辺の広域ターミナル性と再開発商業集積', updatedAt: '2026-06-11' },
  100318: { tier: 3, reason: '小倉駅周辺の地域ターミナル性と駅前商業', updatedAt: '2026-06-11' },
  100319: { tier: 4, reason: '博多駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  100402: { tier: 4, reason: '上野駅周辺の商業・飲食・観光集積', updatedAt: '2026-06-11' },
  100403: { tier: 4, reason: '大宮駅周辺の広域ターミナル性と駅前商業', updatedAt: '2026-06-11' },
  100411: { tier: 4, reason: '仙台駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1110315: { tier: 4, reason: '札幌駅周辺の大規模商業・交通結節点', updatedAt: '2026-06-11' },
  1130102: { tier: 4, reason: '新橋駅周辺の高密度な飲食・オフィス集積', updatedAt: '2026-06-11' },
  1130104: { tier: 3, reason: '川崎駅周辺の大型商業施設と飲食集積', updatedAt: '2026-06-11' },
  1130105: { tier: 4, reason: '横浜駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1130204: { tier: 3, reason: '恵比寿駅周辺の飲食・商業集積', updatedAt: '2026-06-11' },
  1130205: { tier: 4, reason: '渋谷駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  1130208: { tier: 4, reason: '新宿駅周辺の国内最大級ターミナル性と繁華街', updatedAt: '2026-06-11' },
  1130212: { tier: 4, reason: '池袋駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1130222: { tier: 4, reason: '秋葉原駅周辺の商業・飲食・観光集積', updatedAt: '2026-06-11' },
  1130225: { tier: 4, reason: '有楽町・銀座周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1130307: { tier: 3, reason: '武蔵小杉駅周辺の複数路線結節点と商業集積', updatedAt: '2026-06-11' },
  1130325: { tier: 3, reason: '立川駅周辺の多摩地域拠点としての商業集積', updatedAt: '2026-06-11' },
  1130611: { tier: 3, reason: '町田駅周辺の地域繁華街・商業集積', updatedAt: '2026-06-11' },
  1131104: { tier: 3, reason: '吉祥寺駅周辺の飲食・商業集積', updatedAt: '2026-06-11' },
  1131316: { tier: 3, reason: '飯田橋駅周辺の複数路線結節点と飲食選択肢', updatedAt: '2026-06-11' },
  1131331: { tier: 3, reason: '船橋駅周辺の地域拠点としての商業集積', updatedAt: '2026-06-11' },
  1131339: { tier: 3, reason: '千葉駅周辺の県都ターミナル性と商業集積', updatedAt: '2026-06-11' },
  1131905: { tier: 3, reason: 'さいたま新都心駅周辺の商業施設・イベント拠点', updatedAt: '2026-06-11' },
  1132005: { tier: 3, reason: '北千住駅周辺の複数路線結節点と飲食集積', updatedAt: '2026-06-11' },
  1132015: { tier: 3, reason: '柏駅周辺の地域繁華街・商業集積', updatedAt: '2026-06-11' },
  1132614: { tier: 3, reason: '海浜幕張駅周辺の商業・イベント拠点', updatedAt: '2026-06-11' },
  1160214: { tier: 4, reason: '大阪駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1160314: { tier: 3, reason: '神戸元町周辺の商業・飲食・観光集積', updatedAt: '2026-06-11' },
  1160719: { tier: 4, reason: '天王寺駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  1161724: { tier: 3, reason: '京橋駅周辺の複数路線結節点と飲食集積', updatedAt: '2026-06-11' },
  1141102: { tier: 3, reason: '金山駅周辺の複数路線結節点と飲食選択肢', updatedAt: '2026-06-11' },
  1141601: { tier: 3, reason: '岐阜駅周辺の地域ターミナル性と駅前商業', updatedAt: '2026-06-11' },
  2400605: { tier: 3, reason: '下北沢駅周辺の飲食・商業集積', updatedAt: '2026-06-11' },
  2600103: { tier: 3, reason: '中目黒駅周辺の飲食・商業集積', updatedAt: '2026-06-11' },
  2600107: { tier: 3, reason: '自由が丘駅周辺の飲食・商業集積', updatedAt: '2026-06-11' },
  2600307: { tier: 3, reason: '二子玉川駅周辺の大型商業施設と飲食選択肢', updatedAt: '2026-06-11' },
  2800111: { tier: 4, reason: '銀座駅周辺の代表的商業・飲食集積', updatedAt: '2026-06-11' },
  2800118: { tier: 4, reason: '表参道駅周辺の代表的商業・飲食集積', updatedAt: '2026-06-11' },
  2800208: { tier: 4, reason: '大手町・東京駅周辺の高密度なオフィス・飲食集積', updatedAt: '2026-06-11' },
  2800319: { tier: 4, reason: '六本木駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  3000136: { tier: 4, reason: '名鉄名古屋駅周辺の名古屋駅一体の商業・飲食集積', updatedAt: '2026-06-11' },
  3100101: { tier: 4, reason: '大阪難波駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  3102701: { tier: 4, reason: '近鉄名古屋駅周辺の名古屋駅一体の商業・飲食集積', updatedAt: '2026-06-11' },
  3200101: { tier: 4, reason: '難波駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  3300101: { tier: 4, reason: '三条駅周辺の京都中心部の飲食・商業集積', updatedAt: '2026-06-11' },
  3400101: { tier: 4, reason: '大阪梅田駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  3400301: { tier: 4, reason: '京都河原町駅周辺の代表的繁華街・商業集積', updatedAt: '2026-06-11' },
  3500101: { tier: 4, reason: '大阪梅田駅周辺の大規模商業・飲食集積', updatedAt: '2026-06-11' },
  3600101: { tier: 4, reason: '西鉄福岡（天神）駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  9910206: { tier: 4, reason: 'さっぽろ駅周辺の札幌駅一体の商業・交通結節点', updatedAt: '2026-06-11' },
  9910208: { tier: 4, reason: 'すすきの駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  9951310: { tier: 4, reason: '栄駅周辺の名古屋中心部の代表的商業・飲食集積', updatedAt: '2026-06-11' },
  9961809: { tier: 4, reason: '心斎橋駅周辺の代表的繁華街・商業集積', updatedAt: '2026-06-11' },
  9961810: { tier: 4, reason: 'なんば駅周辺の代表的繁華街・飲食集積', updatedAt: '2026-06-11' },
  9963001: { tier: 4, reason: '三宮駅周辺の神戸中心部の商業・飲食集積', updatedAt: '2026-06-11' },
  9971009: { tier: 4, reason: '紙屋町東駅周辺の広島中心部の商業・飲食集積', updatedAt: '2026-06-11' },
};

export function getStationAreaTier(station: Pick<Station, 'c'>): StationAreaTierInfo {
  const entry = STATION_AREA_TIERS_BY_CODE[station.c];
  const definition = STATION_AREA_TIER_DEFINITIONS[entry?.tier ?? 0];

  if (!entry) {
    return {
      ...definition,
      source: 'unlisted-default',
    };
  }

  return {
    ...definition,
    source: 'manual-seed',
    reason: entry.reason,
    updatedAt: entry.updatedAt,
  };
}
