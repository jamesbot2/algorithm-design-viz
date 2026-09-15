import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack 1D WRONG forward update (反例) — complete TypeScript reference. */\nexport function knapsackDp1dWrongForward(weights: number[], values: number[], W: number): number {\n  const dp = Array(W + 1).fill(0)\n  for (let i = 0; i < weights.length; i++) {\n    const wt = weights[i]!\n    const val = values[i]!\n    for (let w = wt; w <= W; w++) {\n      dp[w] = Math.max(dp[w]!, dp[w - wt]! + val)\n    }\n  }\n  return dp[W]!\n}\n"

export const KNAPSACK_DP1D_WRONG_TS_HASH = "3841fcd5674a9c831bcd6a643b4e7b1fa69fd1cf9bb28f24285ede6b19735cda"

export function getKNAPSACK_DP1D_WRONGCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.dp1dWrong.ts",
    language: 'typescript',
    title: "0-1 背包一维正向反例 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_DP1D_WRONG_TS_HASH,
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
    "id": "forward",
    "label": "【反例】正向更新",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "update",
    "label": "错误滚动",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "done",
    "label": "返回（不可信）",
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

export function knapsack_dp1d_wrongSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
