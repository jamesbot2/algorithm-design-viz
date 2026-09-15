import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** BFS shortest path on unweighted graph — complete TypeScript reference. */\nexport function bfs(adj: number[][], start: number): { dist: number[]; parent: number[] } {\n  const n = adj.length\n  const dist = Array(n).fill(-1)\n  const parent = Array(n).fill(-1)\n  const q: number[] = [start]\n  dist[start] = 0\n  let head = 0\n  while (head < q.length) {\n    const u = q[head++]!\n    for (const v of adj[u]!) {\n      if (dist[v]! < 0) {\n        dist[v] = dist[u]! + 1\n        parent[v] = u\n        q.push(v)\n      }\n    }\n  }\n  return { dist, parent }\n}\n"

export const BFS_TS_HASH = "0630a6453f626d450309a6700ebe0b2890090e4a9cbd0859dfb0daea8ae0e3db"

export function getBFSCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "bfs.ts",
    language: 'typescript',
    title: "BFS (TypeScript)",
    source: TS_SOURCE,
    sourceHash: BFS_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "源点入队",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  },
  {
    "id": "dequeue",
    "label": "出队",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "visit",
    "label": "发现邻点",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  },
  {
    "id": "enqueue",
    "label": "入队",
    "range": {
      "startLine": 15,
      "endLine": 15
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function bfsSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
