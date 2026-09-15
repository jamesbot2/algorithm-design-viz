import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Dijkstra with binary heap — complete TypeScript reference. */\nexport function dijkstraHeap(\n  n: number,\n  start: number,\n  adj: { v: number; w: number }[][],\n): { dist: number[]; parent: number[] } {\n  const INF = Number.POSITIVE_INFINITY\n  const dist = Array(n).fill(INF)\n  const parent = Array(n).fill(-1)\n  dist[start] = 0\n  const heap: { u: number; d: number }[] = [{ u: start, d: 0 }]\n  const push = (u: number, d: number) => {\n    heap.push({ u, d })\n    let i = heap.length - 1\n    while (i > 0) {\n      const p = (i - 1) >> 1\n      if (heap[p]!.d <= heap[i]!.d) break\n      const t = heap[p]!; heap[p] = heap[i]!; heap[i] = t\n      i = p\n    }\n  }\n  const pop = (): { u: number; d: number } | undefined => {\n    if (!heap.length) return undefined\n    const top = heap[0]!\n    const last = heap.pop()!\n    if (heap.length) {\n      heap[0] = last\n      let i = 0\n      for (;;) {\n        let l = i * 2 + 1\n        let r = l + 1\n        let best = i\n        if (l < heap.length && heap[l]!.d < heap[best]!.d) best = l\n        if (r < heap.length && heap[r]!.d < heap[best]!.d) best = r\n        if (best === i) break\n        const t = heap[i]!; heap[i] = heap[best]!; heap[best] = t\n        i = best\n      }\n    }\n    return top\n  }\n  while (heap.length) {\n    const cur = pop()!\n    if (cur.d !== dist[cur.u]) continue\n    for (const { v, w } of adj[cur.u]!) {\n      if (dist[cur.u]! + w < dist[v]!) {\n        dist[v] = dist[cur.u]! + w\n        parent[v] = cur.u\n        push(v, dist[v]!)\n      }\n    }\n  }\n  return { dist, parent }\n}\n"

export const DIJKSTRA_HEAP_TS_HASH = "166f2290f1b6d52bf37a801356171928024726edf96948e26e4edb399a15da0f"

export function getDIJKSTRA_HEAPCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "dijkstraHeap.ts",
    language: 'typescript',
    title: "堆优化 Dijkstra (TypeScript)",
    source: TS_SOURCE,
    sourceHash: DIJKSTRA_HEAP_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "extract",
    "label": "堆弹出",
    "range": {
      "startLine": 43,
      "endLine": 43
    }
  },
  {
    "id": "stale",
    "label": "过期跳过",
    "range": {
      "startLine": 44,
      "endLine": 44
    }
  },
  {
    "id": "relax",
    "label": "松弛",
    "range": {
      "startLine": 46,
      "endLine": 46
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function dijkstra_heapSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
