import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack backtracking — complete TypeScript reference. */\nexport function knapsackBacktracking(weights: number[], values: number[], W: number): number {\n  let best = 0\n  function dfs(i: number, remW: number, cur: number): void {\n    if (i === weights.length) {\n      if (cur > best) best = cur\n      return\n    }\n    dfs(i + 1, remW, cur)\n    if (weights[i]! <= remW) {\n      dfs(i + 1, remW - weights[i]!, cur + values[i]!)\n    }\n  }\n  dfs(0, W, 0)\n  return best\n}\n"

export const KNAPSACK_BT_TS_HASH = "f262ed60bfb910e0d990e5e7b4ab1d1073a37c91ef1b80005442b0c0f02c86af"

export function getKNAPSACK_BTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.backtracking.ts",
    language: 'typescript',
    title: "0-1 背包回溯 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_BT_TS_HASH,
    anchors: [
  {
    "id": "call",
    "label": "递归",
    "range": {
      "startLine": 4,
      "endLine": 4
    }
  },
  {
    "id": "skip",
    "label": "不选",
    "range": {
      "startLine": 9,
      "endLine": 9
    }
  },
  {
    "id": "take",
    "label": "选取",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "best",
    "label": "更新最优",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_btSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
