import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** N-Queens backtracking — complete TypeScript reference. */\nexport function solveNQueens(n: number): number[][] {\n  const solutions: number[][] = []\n  const cols: number[] = Array(n).fill(-1)\n  function isSafe(row: number, col: number): boolean {\n    for (let r = 0; r < row; r++) {\n      const c = cols[r]!\n      if (c === col || Math.abs(c - col) === row - r) return false\n    }\n    return true\n  }\n  function dfs(row: number): void {\n    if (row === n) {\n      solutions.push(cols.slice())\n      return\n    }\n    for (let col = 0; col < n; col++) {\n      if (!isSafe(row, col)) continue\n      cols[row] = col\n      dfs(row + 1)\n      cols[row] = -1\n    }\n  }\n  dfs(0)\n  return solutions\n}\n"

export const N_QUEENS_TS_HASH = "2be0675249b23c5cfdeb9e6fb4a2d8251c1d67f32196acb10a5d483a7600c870"

export function getN_QUEENSCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "nQueens.ts",
    language: 'typescript',
    title: "N 皇后 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: N_QUEENS_TS_HASH,
    anchors: [
  {
    "id": "call",
    "label": "递归进入",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  },
  {
    "id": "conflict",
    "label": "冲突检测",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "place",
    "label": "放置皇后",
    "range": {
      "startLine": 19,
      "endLine": 19
    }
  },
  {
    "id": "recurse",
    "label": "递归下一行",
    "range": {
      "startLine": 20,
      "endLine": 20
    }
  },
  {
    "id": "backtrack",
    "label": "回溯撤销",
    "range": {
      "startLine": 21,
      "endLine": 21
    }
  },
  {
    "id": "solution",
    "label": "记录解",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  }
,
  {
    "id": "done",
    "label": "返回全部解",
    "range": {
      "startLine": 25,
      "endLine": 25
    }
  },
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 25,
      "endLine": 25
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function n_queensSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
