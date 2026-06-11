import type { AdjacencyList } from './types';

export const UNREACHABLE = Number.POSITIVE_INFINITY;

interface HeapItem {
  node: number;
  distance: number;
}

class MinHeap {
  private items: HeapItem[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: HeapItem): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    const first = this.items[0];
    const last = this.items.pop();
    if (last && this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return first;
  }

  private bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.items[parent].distance <= this.items[current].distance) {
        break;
      }
      [this.items[parent], this.items[current]] = [this.items[current], this.items[parent]];
      current = parent;
    }
  }

  private bubbleDown(index: number): void {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (left < this.items.length && this.items[left].distance < this.items[smallest].distance) {
        smallest = left;
      }
      if (right < this.items.length && this.items[right].distance < this.items[smallest].distance) {
        smallest = right;
      }
      if (smallest === current) {
        break;
      }
      [this.items[current], this.items[smallest]] = [this.items[smallest], this.items[current]];
      current = smallest;
    }
  }
}

export function dijkstra(adjacency: AdjacencyList, startNode: number): Float64Array {
  const distances = new Float64Array(adjacency.length);
  distances.fill(UNREACHABLE);

  if (startNode < 0 || startNode >= adjacency.length) {
    return distances;
  }

  distances[startNode] = 0;
  const heap = new MinHeap();
  heap.push({ node: startNode, distance: 0 });

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || current.distance !== distances[current.node]) {
      continue;
    }

    for (const edge of adjacency[current.node]) {
      const nextDistance = current.distance + edge.weight;
      if (nextDistance < distances[edge.to]) {
        distances[edge.to] = nextDistance;
        heap.push({ node: edge.to, distance: nextDistance });
      }
    }
  }

  return distances;
}
