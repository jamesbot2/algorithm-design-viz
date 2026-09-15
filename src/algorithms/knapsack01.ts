import type { Step } from '../types/step'

export const meta = {
  id: 'knapsack01',
  title: '0-1 背包',
  complexity: '时间 O(nW)，空间 O(nW)',
  description: '物品不可分割，DP：dp[i][w] = 前 i 件物品容量 w 的最大价值。',
  code: `for i = 1..n:
  for w = 0..W:
    dp[i][w] = dp[i-1][w]
    if w >= wt[i]:
      dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i]] + val[i])`,
  defaultWeights: [2, 3, 4, 5],
  defaultValues: [3, 4, 5, 6],
  defaultCapacity: 8,
}

export function generateSteps(
  _arr: number[],
  weights = meta.defaultWeights,
  values = meta.defaultValues,
  W = meta.defaultCapacity,
): Step[] {
  const n = weights.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0))
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, vars: Record<string, string | number | boolean | null> = {}, hl: number[] = [], codeLine?: number) => {
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      arrays: { weights: [...weights], values: [...values] },
      highlights: { weights: hl },
      vars: { n, W, ...vars },
      codeLine,
    })
  }
  snap('初始化 dp 表为 0', {}, [], 0)
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w]
      snap(`不选物品 ${i}：dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}`, { i, w, wt: weights[i - 1], val: values[i - 1] }, [i - 1], 2)
      if (w >= weights[i - 1]) {
        const take = dp[i - 1][w - weights[i - 1]] + values[i - 1]
        snap(`可选：take = ${take}`, { i, w, take, skip: dp[i][w] }, [i - 1], 4)
        if (take > dp[i][w]) {
          dp[i][w] = take
          snap(`选物品 ${i} 更优：dp[${i}][${w}] = ${take}`, { i, w, take }, [i - 1], 4)
        }
      }
    }
  }
  snap(`完成：最大价值 = ${dp[n][W]}`, { answer: dp[n][W] }, [], 0)
  return steps
}
