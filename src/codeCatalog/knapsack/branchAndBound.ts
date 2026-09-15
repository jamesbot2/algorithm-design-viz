import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** 0-1 knapsack branch-and-bound (density bound) — complete TypeScript reference. */\nexport function knapsackBranchAndBound(weights: number[], values: number[], W: number): number {\n  const n = weights.length\n  const order = Array.from({ length: n }, (_, i) => i).sort(\n    (a, b) => values[b]! / weights[b]! - values[a]! / weights[a]!,\n  )\n  let best = 0\n  function bound(i: number, remW: number, cur: number): number {\n    let b = cur\n    let w = remW\n    for (let k = i; k < n; k++) {\n      const idx = order[k]!\n      if (weights[idx]! <= w) {\n        w -= weights[idx]!\n        b += values[idx]!\n      } else {\n        b += (values[idx]! / weights[idx]!) * w\n        break\n      }\n    }\n    return b\n  }\n  function dfs(i: number, remW: number, cur: number): void {\n    if (i === n) {\n      if (cur > best) best = cur\n      return\n    }\n    if (bound(i, remW, cur) <= best) return\n    const idx = order[i]!\n    if (weights[idx]! <= remW) dfs(i + 1, remW - weights[idx]!, cur + values[idx]!)\n    dfs(i + 1, remW, cur)\n  }\n  dfs(0, W, 0)\n  return best\n}\n"

export const KNAPSACK_BB_TS_HASH = "0299a4ab0b02d8a41f0efd9e934166a9fed4a976b617959425790235c1c39ad5"

export function getKNAPSACK_BBCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "knapsack.branchAndBound.ts",
    language: 'typescript',
    title: "0-1 背包分支限界 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KNAPSACK_BB_TS_HASH,
    anchors: [
  {
    "id": "bound",
    "label": "分数上界",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "prune",
    "label": "剪枝",
    "range": {
      "startLine": 28,
      "endLine": 28
    }
  },
  {
    "id": "take",
    "label": "选入",
    "range": {
      "startLine": 30,
      "endLine": 30
    }
  },
  {
    "id": "skip",
    "label": "不选",
    "range": {
      "startLine": 31,
      "endLine": 31
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function knapsack_bbSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
