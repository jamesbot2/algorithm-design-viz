import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Matrix-chain order DP — complete TypeScript reference. */\nexport function matrixChainOrder(dims: number[]): { cost: number; split: number[][] } {\n  const n = dims.length - 1\n  const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0))\n  const split: number[][] = Array.from({ length: n }, () => Array(n).fill(0))\n  for (let len = 2; len <= n; len++) {\n    for (let i = 0; i <= n - len; i++) {\n      const j = i + len - 1\n      dp[i]![j] = Infinity\n      for (let k = i; k < j; k++) {\n        const cost = dp[i]![k]! + dp[k + 1]![j]! + dims[i]! * dims[k + 1]! * dims[j + 1]!\n        if (cost < dp[i]![j]!) {\n          dp[i]![j] = cost\n          split[i]![j] = k\n        }\n      }\n    }\n  }\n  return { cost: dp[0]![n - 1]!, split }\n}\n"

export const MATRIX_CHAIN_TS_HASH = "18e83813708a47b979b6852edcf0d91c4712b4e0291d51fa3cecf53a5ae78850"

export function getMATRIX_CHAINCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "matrixChain.ts",
    language: 'typescript',
    title: "矩阵链乘 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: MATRIX_CHAIN_TS_HASH,
    anchors: [
  {
    "id": "lenLoop",
    "label": "链长循环",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  },
  {
    "id": "trySplit",
    "label": "尝试分裂点",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "cost",
    "label": "计算代价",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "update",
    "label": "更新最优",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function matrix_chainSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
