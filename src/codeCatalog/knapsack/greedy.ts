import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack greedy-by-density (NOT optimal) — complete TypeScript reference. */\nexport function knapsackGreedyByDensity(\n  weights: number[],\n  values: number[],\n  W: number,\n): { value: number; selected: number[] } {\n  const order = Array.from({ length: weights.length }, (_, i) => i).sort(\n    (a, b) => values[b]! / weights[b]! - values[a]! / weights[a]!,\n  )\n  let rem = W\n  let value = 0\n  const selected: number[] = []\n  for (const i of order) {\n    if (weights[i]! <= rem) {\n      rem -= weights[i]!\n      value += values[i]!\n      selected.push(i)\n    }\n  }\n  return { value, selected }\n}\n"

export const KNAPSACK_GREEDY_TS_HASH = "ccecbcbd9534c58e684aa2e63cda0dfda72cdb5ac4ae76580bafce165adaf293"

export function getKNAPSACK_GREEDYCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.greedy.ts",
    language: 'typescript',
    title: "0-1 背包贪心密度 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_GREEDY_TS_HASH,
    anchors: [
  {
    "id": "sort",
    "label": "按密度排序",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "check",
    "label": "检查容量",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  },
  {
    "id": "pick",
    "label": "贪心选取",
    "range": {
      "startLine": 17,
      "endLine": 17
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 20,
      "endLine": 20
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_greedySourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
