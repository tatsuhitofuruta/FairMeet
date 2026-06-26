export interface Station {
  c: number;
  n: string;
  o: string;
  k: string;
  p: number;
  lat: number;
  lng: number;
  l: number[];
}

export interface Line {
  n: string;
  c: string | null;
}

export type EdgeTuple = [number, number, number];

export interface GraphData {
  version: 1;
  generatedAt: string;
  source: string;
  nodeCount: number;
  stations: Station[];
  lines: Line[];
  edges: EdgeTuple[];
}

export interface AdjacentEdge {
  to: number;
  weight: number;
}

export type AdjacencyList = AdjacentEdge[][];

export type SearchMode = 'fair' | 'balanced' | 'total';

export type StationAreaTier = 0 | 1 | 2 | 3 | 4;
export type StationAreaTierGrade = 'D' | 'C' | 'B' | 'A' | 'S';

export interface StationAreaTierDefinition {
  tier: StationAreaTier;
  grade: StationAreaTierGrade;
  label: string;
  summary: string;
}

export interface StationAreaTierInfo extends StationAreaTierDefinition {
  source: 'passenger-count' | 'manual-seed' | 'manual-override' | 'unlisted-default';
  reason?: string;
  updatedAt?: string;
}
