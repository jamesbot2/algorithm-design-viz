import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack brute force — complete TypeScript reference. */\nexport function knapsackBrute(weights: number[], values: number[], W: number): number {\n  const n = weights.length\n  let best = 0\n  const total = 1 << n\n  for (let mask = 0; mask < total; mask++) {\n    let wt = 0\n    let val = 0\n    for (let i = 0; i < n; i++) {\n      if (mask & (1 << i)) {\n        wt += weights[i]!\n        val += values[i]!\n      }\n    }\n    if (wt <= W && val > best) best = val\n  }\n  return best\n}\n"

export const KNAPSACK_BRUTE_TS_HASH = "ee0866604a174b635b40a372a173fe54a7ac8deca818604407ce33f821c9020e"

export function getKNAPSACK_BRUTECatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.brute.ts",
    language: 'typescript',
    title: "0-1 背包暴力枚举 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_BRUTE_TS_HASH,
    anchors: [
  {
    "id": "enum",
    "label": "枚举掩码",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  },
  {
    "id": "sum",
    "label": "累加重量价值",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "feasible",
    "label": "可行更新",
    "range": {
      "startLine": 15,
      "endLine": 15
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 17,
      "endLine": 17
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_bruteSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
