import type { Step } from '../types/step'

export const meta = {
  id: 'editDistance',
  title: '编辑距离',
  complexity: '时间 O(mn)，空间 O(mn)',
  description: '将串 A 变为 B 的最少插入/删除/替换次数。',
  code: `if A[i]==B[j]: dp[i][j]=dp[i-1][j-1]
else: dp[i][j]=1+min(插,删,替)`,
  defaultA: 'kitten',
  defaultB: 'sitting',
}

export function generateSteps(_arr: number[], A = meta.defaultA, B = meta.defaultB): Step[] {
  const m = A.length, n = B.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      arrays: { A: A.split(''), B: B.split('') },
      vars,
      codeLine,
    })
  }
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  snap('边界：空串编辑距离 = 长度', { m, n }, 0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
        snap(`'${A[i - 1]}'=='${B[j - 1]}' → dp[${i}][${j}]=${dp[i][j]}`, { i, j }, 0)
      } else {
        const ins = dp[i][j - 1], del = dp[i - 1][j], rep = dp[i - 1][j - 1]
        dp[i][j] = 1 + Math.min(ins, del, rep)
        snap(`不相等 → 1+min(插${ins},删${del},替${rep})=${dp[i][j]}`, { i, j, ins, del, rep }, 1)
      }
    }
  }
  snap(`编辑距离 = ${dp[m][n]}`, { answer: dp[m][n] }, 0)
  return steps
}
