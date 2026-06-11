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
