import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Bellman-Ford — complete TypeScript reference. */\nexport function bellmanFord(\n  n: number,\n  edges: { u: number; v: number; w: number }[],\n  start: number,\n): { dist: number[]; parent: number[]; negCycle: boolean } {\n  const INF = Number.POSITIVE_INFINITY\n  const dist = Array(n).fill(INF)\n  const parent = Array(n).fill(-1)\n  dist[start] = 0\n  for (let i = 0; i < n - 1; i++) {\n    for (const e of edges) {\n      if (dist[e.u]! + e.w < dist[e.v]!) {\n        dist[e.v] = dist[e.u]! + e.w\n        parent[e.v] = e.u\n      }\n    }\n  }\n  let negCycle = false\n  for (const e of edges) {\n    if (dist[e.u]! + e.w < dist[e.v]!) {\n      negCycle = true\n      break\n    }\n  }\n  return { dist, parent, negCycle }\n}\n"

export const BELLMAN_FORD_TS_HASH = "5ab0489df3cf22dbba2e0429bc8533203ca6e38550064baabdced9b1287a5fa2"

export function getBELLMAN_FORDCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "bellmanFord.ts",
    language: 'typescript',
    title: "Bellman-Ford (TypeScript)",
    source: TS_SOURCE,
    sourceHash: BELLMAN_FORD_TS_HASH,
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
    "id": "relax",
    "label": "松弛边",
    "range": {
      "startLine": 13,
      "endLine": 13
    }
  },
  {
    "id": "update",
    "label": "更新 dist",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  },
  {
    "id": "negCycle",
    "label": "负环检测",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function bellman_fordSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
