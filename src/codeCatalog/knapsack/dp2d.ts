import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack DP 2D — complete TypeScript reference. */\nexport function knapsackDp2d(\n  weights: number[],\n  values: number[],\n  W: number,\n): { maxValue: number; selected: number[] } {\n  const n = weights.length\n  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0))\n  for (let i = 1; i <= n; i++) {\n    const wt = weights[i - 1]!\n    const val = values[i - 1]!\n    for (let w = 0; w <= W; w++) {\n      dp[i]![w] = dp[i - 1]![w]!\n      if (w >= wt) {\n        const take = dp[i - 1]![w - wt]! + val\n        if (take > dp[i]![w]!) dp[i]![w] = take\n      }\n    }\n  }\n  const selected: number[] = []\n  let w = W\n  for (let i = n; i >= 1; i--) {\n    if (dp[i]![w] !== dp[i - 1]![w]) {\n      selected.push(i - 1)\n      w -= weights[i - 1]!\n    }\n  }\n  selected.reverse()\n  return { maxValue: dp[n]![W]!, selected }\n}\n"

export const KNAPSACK_DP2D_TS_HASH = "d77785520a6afb1313340167c4e44874d75ea0d1168239d70a89fcd808538c66"

export function getKNAPSACK_DP2DCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.dp2d.ts",
    language: 'typescript',
    title: "0-1 背包 DP 二维 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_DP2D_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化表",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "fill",
    "label": "填表不取",
    "range": {
      "startLine": 13,
      "endLine": 13
    }
  },
  {
    "id": "take",
    "label": "尝试选取",
    "range": {
      "startLine": 15,
      "endLine": 15
    }
  },
  {
    "id": "reconstruct",
    "label": "回溯选中",
    "range": {
      "startLine": 24,
      "endLine": 24
    }
  }
,
  {
    "id": "done",
    "label": "返回最优解",
    "range": {
      "startLine": 29,
      "endLine": 29
    }
  },
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 29,
      "endLine": 29
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_dp2dSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
