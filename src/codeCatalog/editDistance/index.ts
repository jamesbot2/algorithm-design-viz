import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Edit distance (Levenshtein) — complete TypeScript reference. */\nexport function editDistance(a: string, b: string): number {\n  const m = a.length\n  const n = b.length\n  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))\n  for (let i = 0; i <= m; i++) dp[i]![0] = i\n  for (let j = 0; j <= n; j++) dp[0]![j] = j\n  for (let i = 1; i <= m; i++) {\n    for (let j = 1; j <= n; j++) {\n      if (a[i - 1] === b[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]!\n      else {\n        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!)\n      }\n    }\n  }\n  return dp[m]![n]!\n}\n"

export const EDIT_DISTANCE_TS_HASH = "970f60003ba58da7b981a329865cfb3abee0f4b6b664e1c046b38e7e72a6bee5"

export function getEDIT_DISTANCECatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "editDistance.ts",
    language: 'typescript',
    title: "编辑距离 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: EDIT_DISTANCE_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化边界",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  },
  {
    "id": "equal",
    "label": "字符相等",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "replace",
    "label": "替换/插入/删除",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 16,
      "endLine": 16
    }
  }
,
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 16,
      "endLine": 16
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function edit_distanceSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
