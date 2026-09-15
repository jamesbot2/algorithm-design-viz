import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = '/**\n * Naive Dijkstra (non-negative weights) — complete TypeScript reference.\n * Anchors: init | selectMin | relax.condition | relax.update\n */\nexport function naiveDijkstra(\n  n: number,\n  start: number,\n  adj: { v: number; w: number }[][],\n): { dist: number[]; parent: number[] } {\n  const INF = Number.POSITIVE_INFINITY\n  const dist = Array<number>(n).fill(INF)\n  const done = Array<boolean>(n).fill(false)\n  const parent = Array<number>(n).fill(-1)\n  dist[start] = 0\n  for (let iter = 0; iter < n; iter++) {\n    let u = -1\n    let best = INF\n    for (let i = 0; i < n; i++) {\n      if (!done[i] && dist[i]! < best) {\n        best = dist[i]!\n        u = i\n      }\n    }\n    if (u < 0 || best === INF) break\n    done[u] = true\n    for (const { v, w } of adj[u]!) {\n      if (dist[u]! + w < dist[v]!) {\n        dist[v] = dist[u]! + w\n        parent[v] = u\n      }\n    }\n  }\n  return { dist, parent }\n}\n'

const PSEUDO_SOURCE = '朴素 Dijkstra（非负权）\ndist[s]=0; 其余=∞; done[*]=false\nrepeat V times:\n  u = argmin { dist[i] | not done[i] }\n  if dist[u]=∞: break\n  done[u]=true\n  for each edge u→v (w):\n    if dist[u]+w < dist[v]:\n      dist[v]=dist[u]+w; parent[v]=u'

export const DIJKSTRA_TS_HASH = 'f81122d5df56fba6aca8c3254d0560a994845a775c6c6059361ab4b2541a8090'
export const DIJKSTRA_PSEUDO_HASH = 'dd2563511074cebc32e652b0fc5ce8abd2d0a0884e7d1fedb21739fec7d1b57d'

export function getDijkstraCatalog(): {
  typescript: CodeDocument
  pseudocode: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: 'dijkstra.naive.ts',
    language: 'typescript',
    title: '朴素 Dijkstra (TypeScript)',
    source: TS_SOURCE,
    sourceHash: DIJKSTRA_TS_HASH,
    anchors: [
    {
      id: 'init',
      label: '初始化 dist[s]=0',
      range: { startLine: 14, endLine: 14 },
    },
    {
      id: 'selectMin',
      label: '扫描选取最小 dist',
      range: { startLine: 19, endLine: 19 },
    },
    {
      id: 'relax.condition',
      label: '松弛条件',
      range: { startLine: 27, endLine: 27 },
    },
    {
      id: 'relax.update',
      label: '松弛更新',
      range: { startLine: 28, endLine: 28 },
    }
    ],
  }
  const pseudocode: CodeDocument = {
    documentId: 'dijkstra.naive.pseudo',
    language: 'pseudocode',
    title: '朴素 Dijkstra（伪代码）',
    source: PSEUDO_SOURCE,
    sourceHash: DIJKSTRA_PSEUDO_HASH,
    anchors: [
      { id: 'init', label: '初始化', range: { startLine: 2, endLine: 2 } },
      { id: 'selectMin', label: '选最小', range: { startLine: 4, endLine: 4 } },
      { id: 'relax.condition', label: '松弛条件', range: { startLine: 8, endLine: 8 } },
      { id: 'relax.update', label: '松弛更新', range: { startLine: 9, endLine: 9 } },
    ],
  }
  return { typescript, pseudocode }
}

/** Sync short hash for RunSnapshot.sourceHash */
export function dijkstraSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
