import type { Step } from '../types/step'

export const meta = {
  id: 'lcs',
  title: '最长公共子序列 (LCS)',
  complexity: '时间 O(mn)，空间 O(mn)',
  description:
    'dp[i][j]：串 X 前 i 与 Y 前 j 的 LCS 长度。填表后回溯恢复一条 LCS 字符串；matrixTargets 含 path。',
  code: `if X[i]==Y[j]: dp[i][j]=dp[i-1][j-1]+1
else: dp[i][j]=max(dp[i-1][j], dp[i][j-1])
# reconstruct: from (m,n) follow matches / max`,
  defaultX: 'ABCBDAB',
  defaultY: 'BDCABA',
  implName: 'lcsDP2D',
  implVersion: '1.2.0',
  timeComplexity: 'O(mn)',
  spaceComplexity: 'O(mn)',
  spaceNotes: 'dp[m+1][n+1]。',
  inputAssumptions: '字符串按 JS code-unit 索引；dp 行列含空前缀。',
  statDefinitions: '不累计 comparisons。',
}

export function reconstructLcs(X: string, Y: string, dp: number[][]): string {
  let i = X.length
  let j = Y.length
  const chars: string[] = []
  while (i > 0 && j > 0) {
    if (X[i - 1] === Y[j - 1]) {
      chars.push(X[i - 1]!)
      i--
      j--
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--
    } else {
      j--
    }
  }
  return chars.reverse().join('')
}

export function lcsPath(X: string, Y: string, dp: number[][]): [number, number][] {
  let i = X.length
  let j = Y.length
  const path: [number, number][] = [[i, j]]
  while (i > 0 && j > 0) {
    if (X[i - 1] === Y[j - 1]) {
      i--
      j--
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--
    } else {
      j--
    }
    path.push([i, j])
  }
  return path
}

export function generateSteps(_arr: number[], X = meta.defaultX, Y = meta.defaultY): Step[] {
  const m = X.length
  const n = Y.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const steps: Step[] = []
  let id = 0
  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    targets?: {
      current?: [number, number]
      reads?: [number, number][]
      writes?: [number, number][]
      path?: [number, number][]
    },
    result?: unknown,
  ) => {
    const arrayPointers: Record<string, Record<string, number>> = {}
    if (typeof vars.i === 'number' && (vars.i as number) > 0) {
      arrayPointers.X = { i: (vars.i as number) - 1 }
    }
    if (typeof vars.j === 'number' && (vars.j as number) > 0) {
      arrayPointers.Y = { j: (vars.j as number) - 1 }
    }
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      matrixTargets: targets ? { dp: targets } : undefined,
      arrays: { X: X.split(''), Y: Y.split('') },
      arrayPointers: Object.keys(arrayPointers).length ? arrayPointers : undefined,
      vars,
      codeLine,
      result,
    })
  }
  snap(`计算 LCS("${X}", "${Y}")`, { m, n }, 0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (X[i - 1] === Y[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
        snap(
          `X[${i - 1}]='${X[i - 1]}' == Y[${j - 1}]='${Y[j - 1]}' → dp[${i}][${j}]=${dp[i]![j]}`,
          { i, j, match: true },
          0,
          {
            current: [i, j],
            reads: [[i - 1, j - 1]],
            writes: [[i, j]],
          },
        )
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
        snap(
          `不相等 → dp[${i}][${j}]=max(${dp[i - 1]![j]},${dp[i]![j - 1]})=${dp[i]![j]}`,
          { i, j, match: false },
          1,
          {
            current: [i, j],
            reads: [
              [i - 1, j],
              [i, j - 1],
            ],
            writes: [[i, j]],
          },
        )
      }
    }
  }
  const lcsStr = reconstructLcs(X, Y, dp)
  const path = lcsPath(X, Y, dp)
  snap(
    `LCS 长度 = ${dp[m]![n]}；一条 LCS = "${lcsStr}"`,
    { answer: dp[m]![n], lcs: lcsStr },
    2,
    { current: [m, n], path },
    { ok: true, length: dp[m]![n], lcs: lcsStr },
  )
  return steps
}
