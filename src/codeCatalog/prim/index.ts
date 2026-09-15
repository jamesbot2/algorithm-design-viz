import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Prim MST (dense O(V^2)) — complete TypeScript reference. */\nexport function prim(\n  n: number,\n  adj: { v: number; w: number }[][],\n  start = 0,\n): { total: number; parent: number[] } {\n  const INF = Number.POSITIVE_INFINITY\n  const key = Array(n).fill(INF)\n  const parent = Array(n).fill(-1)\n  const inMst = Array(n).fill(false)\n  key[start] = 0\n  for (let iter = 0; iter < n; iter++) {\n    let u = -1\n    let best = INF\n    for (let i = 0; i < n; i++) {\n      if (!inMst[i] && key[i]! < best) {\n        best = key[i]!\n        u = i\n      }\n    }\n    if (u < 0) break\n    inMst[u] = true\n    for (const { v, w } of adj[u]!) {\n      if (!inMst[v] && w < key[v]!) {\n        key[v] = w\n        parent[v] = u\n      }\n    }\n  }\n  let total = 0\n  for (let i = 0; i < n; i++) if (parent[i] >= 0) total += key[i]!\n  return { total, parent }\n}\n"

export const PRIM_TS_HASH = "9687a3c2e27d788f345e26c7db350df7e5639f141471e21f009bdd8dbd9afb84"

export function getPRIMCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "prim.ts",
    language: 'typescript',
    title: "Prim MST (TypeScript)",
    source: TS_SOURCE,
    sourceHash: PRIM_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化 key",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "selectMin",
    "label": "选最小 key",
    "range": {
      "startLine": 16,
      "endLine": 16
    }
  },
  {
    "id": "add",
    "label": "加入 MST",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  },
  {
    "id": "relax",
    "label": "松弛邻边",
    "range": {
      "startLine": 24,
      "endLine": 24
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function primSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
