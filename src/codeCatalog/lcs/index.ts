import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** LCS DP + reconstruct — complete TypeScript reference. */\nexport function lcs(X: string, Y: string): { length: number; sequence: string } {\n  const m = X.length\n  const n = Y.length\n  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))\n  for (let i = 0; i <= m; i++) dp[i]![0] = 0\n  for (let j = 0; j <= n; j++) dp[0]![j] = 0\n  for (let i = 1; i <= m; i++) {\n    for (let j = 1; j <= n; j++) {\n      if (X[i - 1] === Y[j - 1]) {\n        dp[i]![j] = dp[i - 1]![j - 1]! + 1\n      } else {\n        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)\n      }\n    }\n  }\n  let i = m\n  let j = n\n  const chars: string[] = []\n  while (i > 0 && j > 0) {\n    if (X[i - 1] === Y[j - 1]) {\n      chars.push(X[i - 1]!)\n      i--\n      j--\n    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {\n      i--\n    } else {\n      j--\n    }\n  }\n  return { length: dp[m]![n]!, sequence: chars.reverse().join('') }\n}\n"

export const LCS_TS_HASH = "1d467860203d6d452152842b6e566146af34977338f3d81a4104e889d5f0b1e9"
export const LCS_PSEUDO_HASH = "af4226f5b58e8bb39e8f2cfe8f42008f66c07b3d05e155d9ada94f916e3888df"

export function getLCSCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "lcs.ts",
    language: 'typescript',
    title: "LCS (TypeScript)",
    source: TS_SOURCE,
    sourceHash: LCS_TS_HASH,
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
    "id": "compareChars",
    "label": "比较字符",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "takeDiagonal",
    "label": "取对角",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "dpFill",
    "label": "取 max 填表",
    "range": {
      "startLine": 13,
      "endLine": 13
    }
  },
  {
    "id": "reconstruct",
    "label": "回溯匹配",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  },
  {
    "id": "reconstructMove",
    "label": "回溯移动",
    "range": {
      "startLine": 25,
      "endLine": 25
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = {
    documentId: "lcs.ts",
    language: 'pseudocode',
    title: "LCS (TypeScript)（伪代码）",
    source: "init dp[*][0]=dp[0][*]=0\nfor i,j:\n  if X[i-1]==Y[j-1]: diagonal\n  else: max\nreconstruct from (m,n)",
    sourceHash: "af4226f5b58e8bb39e8f2cfe8f42008f66c07b3d05e155d9ada94f916e3888df",
    anchors: [
  {
    "id": "init",
    "label": "初始化",
    "range": {
      "startLine": 1,
      "endLine": 1
    }
  },
  {
    "id": "compareChars",
    "label": "比较",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  },
  {
    "id": "takeDiagonal",
    "label": "对角",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  },
  {
    "id": "reconstruct",
    "label": "回溯",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  }
],
  }
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function lcsSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
