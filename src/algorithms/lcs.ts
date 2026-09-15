import type { Step } from '../types/step'

export const meta = {
  id: 'lcs',
  title: '最长公共子序列 (LCS)',
  complexity: '时间 O(mn)，空间 O(mn)',
  description: 'dp[i][j]：串 X 前 i 与 Y 前 j 的 LCS 长度。',
  code: `if X[i]==Y[j]: dp[i][j]=dp[i-1][j-1]+1
else: dp[i][j]=max(dp[i-1][j], dp[i][j-1])`,
  defaultX: 'ABCBDAB',
  defaultY: 'BDCABA',
}

export function generateSteps(_arr: number[], X = meta.defaultX, Y = meta.defaultY): Step[] {
  const m = X.length, n = Y.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      arrays: { X: X.split(''), Y: Y.split('') },
      vars,
      codeLine,
    })
  }
  snap(`计算 LCS("${X}", "${Y}")`, { m, n }, 0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (X[i - 1] === Y[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        snap(`X[${i - 1}]='${X[i - 1]}' == Y[${j - 1}]='${Y[j - 1]}' → dp[${i}][${j}]=${dp[i][j]}`, { i, j, match: true }, 0)
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        snap(`不相等 → dp[${i}][${j}]=max(${dp[i - 1][j]},${dp[i][j - 1]})=${dp[i][j]}`, { i, j, match: false }, 1)
      }
    }
  }
  snap(`LCS 长度 = ${dp[m][n]}`, { answer: dp[m][n] }, 0)
  return steps
}
