import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack 1D correct (reverse) — complete TypeScript reference. */\nexport function knapsackDp1dCorrect(weights: number[], values: number[], W: number): number {\n  const dp = Array(W + 1).fill(0)\n  for (let i = 0; i < weights.length; i++) {\n    const wt = weights[i]!\n    const val = values[i]!\n    for (let w = W; w >= wt; w--) {\n      dp[w] = Math.max(dp[w]!, dp[w - wt]! + val)\n    }\n  }\n  return dp[W]!\n}\n"

export const KNAPSACK_DP1D_CORRECT_TS_HASH = "a427b794ebc84ca37c0bc75d23ba4aa835e59637e1c8d8c9f76da286ae005828"

export function getKNAPSACK_DP1D_CORRECTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.dp1dCorrect.ts",
    language: 'typescript',
    title: "0-1 背包一维正确 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_DP1D_CORRECT_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  },
  {
    "id": "reverse",
    "label": "逆序更新",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "update",
    "label": "滚动更新",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_dp1d_correctSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
