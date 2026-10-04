import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** LCS DP + reconstruct — complete TypeScript reference. */\nexport function lcs(X: string, Y: string): { length: number; sequence: string } {\n  const m = X.length\n  const n = Y.length\n  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))\n  for (let i = 0; i <= m; i++) dp[i]![0] = 0\n  for (let j = 0; j <= n; j++) dp[0]![j] = 0\n  for (let i = 1; i <= m; i++) {\n    for (let j = 1; j <= n; j++) {\n      if (X[i - 1] === Y[j - 1]) {\n        dp[i]![j] = dp[i - 1]![j - 1]! + 1\n      } else {\n        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)\n      }\n    }\n  }\n  let i = m\n  let j = n\n  const chars: string[] = []\n  while (i > 0 && j > 0) {\n    if (X[i - 1] === Y[j - 1]) {\n      chars.push(X[i - 1]!)\n      i--\n      j--\n    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {\n      i--\n    } else {\n      j--\n    }\n  }\n  return { length: dp[m]![n]!, sequence: chars.reverse().join('') }\n}\n"

export const LCS_TS_HASH = "1d467860203d6d452152842b6e566146af34977338f3d81a4104e889d5f0b1e9"
export const LCS_PSEUDO_HASH = "abc1119b5491b9bd34abca76f56649d653231017986ddf135163d08c82183c90"

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
    "id": "write",
    "label": "写入 dp（对角）",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "dpWrite",
    "label": "写入 dp",
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
  // V26: backtracking starts at (m, n) — `let i = m` / `let j = n`
  {
    "id": "reconstructStart",
    "label": "从 (m,n) 开始回溯",
    "range": {
      "startLine": 17,
      "endLine": 18
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
  },
  // V26: a backtrack move is the statement in its branch; line 25 is the up-move test
  {
    "id": "reconstructCompare",
    "label": "比较上/左",
    "range": {
      "startLine": 25,
      "endLine": 25
    }
  },
  {
    "id": "reconstructUp",
    "label": "上移 i--",
    "range": {
      "startLine": 26,
      "endLine": 26
    }
  },
  {
    "id": "reconstructLeft",
    "label": "左移 j--",
    "range": {
      "startLine": 28,
      "endLine": 28
    }
  },
  // V26: the final「LCS 长度 = …」frame is the return
  {
    "id": "done",
    "label": "返回长度与序列",
    "range": {
      "startLine": 31,
      "endLine": 31
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = {
    documentId: "lcs.pseudo",
    language: 'pseudocode',
    title: "LCS（伪代码）",
    source: "LCS(X, Y):\n  m ← |X|;  n ← |Y|;  dp ← (m+1)×(n+1) 表\n  for i ← 0..m: dp[i][0] ← 0\n  for j ← 0..n: dp[0][j] ← 0\n  for i ← 1..m:\n    for j ← 1..n:\n      if X[i-1] = Y[j-1]:\n        dp[i][j] ← dp[i-1][j-1] + 1\n      else:\n        dp[i][j] ← max(dp[i-1][j], dp[i][j-1])\n  i ← m;  j ← n;  S ← []\n  while i > 0 and j > 0:\n    if X[i-1] = Y[j-1]:\n      append X[i-1] to S\n      i ← i-1;  j ← j-1\n    else if dp[i-1][j] ≥ dp[i][j-1]:   ▷ 相等时向上\n      i ← i-1\n    else:\n      j ← j-1\n  return (dp[m][n], reverse(S))",
    sourceHash: "abc1119b5491b9bd34abca76f56649d653231017986ddf135163d08c82183c90",
    // V27: the pseudocode's own statements for every trace event (ids shared with lcs.ts;
    // line numbers are this document's — never copied from the TypeScript reference).
    anchors: [
      {
        "id": "init",
        "label": "初始化边界",
        "range": {
          "startLine": 3,
          "endLine": 4
        }
      },
      {
        "id": "compareChars",
        "label": "比较 X[i-1] 与 Y[j-1]",
        "range": {
          "startLine": 7,
          "endLine": 7
        }
      },
      {
        "id": "takeDiagonal",
        "label": "相等：取对角 +1",
        "range": {
          "startLine": 8,
          "endLine": 8
        }
      },
      {
        "id": "dpFill",
        "label": "不等：取上/左较大者",
        "range": {
          "startLine": 10,
          "endLine": 10
        }
      },
      {
        "id": "reconstructStart",
        "label": "从 (m,n) 开始回溯",
        "range": {
          "startLine": 11,
          "endLine": 11
        }
      },
      {
        "id": "reconstruct",
        "label": "匹配：收集字符并沿对角移动",
        "range": {
          "startLine": 14,
          "endLine": 15
        }
      },
      {
        "id": "reconstructCompare",
        "label": "比较上/左（相等时向上）",
        "range": {
          "startLine": 16,
          "endLine": 16
        }
      },
      {
        "id": "reconstructUp",
        "label": "上移",
        "range": {
          "startLine": 17,
          "endLine": 17
        }
      },
      {
        "id": "reconstructLeft",
        "label": "左移",
        "range": {
          "startLine": 19,
          "endLine": 19
        }
      },
      {
        "id": "done",
        "label": "返回长度与序列",
        "range": {
          "startLine": 20,
          "endLine": 20
        }
      }
    ],
  }
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function lcsSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
