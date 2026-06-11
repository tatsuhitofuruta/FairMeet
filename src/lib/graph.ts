import type { AdjacencyList, GraphData } from './types';

export async function loadGraphData(fetchImpl: typeof fetch = fetch): Promise<GraphData> {
  const response = await fetchImpl(`${import.meta.env.BASE_URL}data/graph.json`);
  if (!response.ok) {
    throw new Error(`graph.json の読み込みに失敗しました (${response.status})`);
  }
  return (await response.json()) as GraphData;
}

export function buildAdjacencyList(graph: GraphData): AdjacencyList {
  const adjacency: AdjacencyList = Array.from({ length: graph.nodeCount }, () => []);

  for (const [a, b, weight] of graph.edges) {
    if (a < 0 || b < 0 || a >= graph.nodeCount || b >= graph.nodeCount) {
      continue;
    }
    adjacency[a].push({ to: b, weight });
    adjacency[b].push({ to: a, weight });
  }

  return adjacency;
}
