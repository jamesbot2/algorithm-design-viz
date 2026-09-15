import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Kruskal MST — complete TypeScript reference. */\nexport function kruskal(\n  n: number,\n  edges: { u: number; v: number; w: number }[],\n): { total: number; mst: { u: number; v: number; w: number }[] } {\n  const parent = Array.from({ length: n }, (_, i) => i)\n  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))\n  const sorted = edges.slice().sort((a, b) => a.w - b.w)\n  const mst: { u: number; v: number; w: number }[] = []\n  let total = 0\n  for (const e of sorted) {\n    const a = find(e.u)\n    const b = find(e.v)\n    if (a === b) continue\n    parent[a] = b\n    mst.push(e)\n    total += e.w\n    if (mst.length === n - 1) break\n  }\n  return { total, mst }\n}\n"

export const KRUSKAL_TS_HASH = "ceb14d7ae0926b75d14d35ab2094eaa6850c7d18e8640c5ffdd5ad318b5ddbd2"

export function getKRUSKALCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "kruskal.ts",
    language: 'typescript',
    title: "Kruskal MST (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KRUSKAL_TS_HASH,
    anchors: [
  {
    "id": "sort",
    "label": "按权排序",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "find",
    "label": "并查集查找",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  },
  {
    "id": "skip",
    "label": "同集合跳过",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  },
  {
    "id": "union",
    "label": "合并加入 MST",
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

export function kruskalSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
