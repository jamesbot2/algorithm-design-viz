import type { Step } from '../types/step'

export const meta = {
  id: 'knapsack01',
  title: '0-1 背包',
  complexity: '时间 O(nW)，空间 O(nW)',
  description:
    '物品不可分割。DP 表行 0..n（行 i 对应前 i 件物品，物品下标 0-based 为 i-1）；列 0..W 为容量。可视化矩阵索引标注见行/列标签。',
  code: `for i = 1..n:
  for w = 0..W:
    dp[i][w] = dp[i-1][w]
    if w >= wt[i]:
      dp[i][w] = max(dp[i][w], dp[i-1][w-wt[i]] + val[i])`,
  defaultWeights: [2, 3, 4, 5],
  defaultValues: [3, 4, 5, 6],
  defaultCapacity: 8,
  implName: 'knapsack01DP2D',
  implVersion: '1.1.0',
  timeComplexity: 'O(nW)',
  spaceComplexity: 'O(nW)',
  spaceNotes: 'dp[n+1][W+1]；可滚动优化至 O(W)，本实现为二维便于可视化。',
  inputAssumptions:
    'weights/values 等长；W≥0；索引：矩阵行 i=0 为空集，物品 0-based；单元格坐标 0-based。',
  statDefinitions: '不累计 comparisons。',
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
  const DOC = 'knapsack.dp2d.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    hl: number[] = [],
    codeLine?: number,
    targets?: {
      current?: [number, number]
      reads?: [number, number][]
      writes?: [number, number][]
    },
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    steps.push({
      id: id++,
      message,
      matrices: { dp: dp.map((r) => [...r]) },
      matrixTargets: targets ? { dp: targets } : undefined,
      arrays: { weights: [...weights], values: [...values] },
      highlights: { weights: hl },
      arrayPointers: hl.length ? { weights: { item: hl[0]! } } : undefined,
      vars: { n, W, ...vars },
      codeLine,
      result,
      codeRefs,
    })
  }
  snap(
    '初始化 dp 表为 0（行 i=物品件数 0..n，列 w=容量 0..W；物品本身 0-based）',
    {},
    [],
    0,
    undefined,
    undefined,
    ref('init'),
  )
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w]
      snap(
        `不选物品 ${i}（0-based 下标 ${i - 1}）：dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}`,
        { i, w, wt: weights[i - 1], val: values[i - 1], itemIndex0: i - 1 },
        [i - 1],
        2,
        {
          current: [i, w],
          reads: [[i - 1, w]],
          writes: [[i, w]],
        },
        undefined,
        ref('fill'),
      )
      if (w >= weights[i - 1]) {
        const take = dp[i - 1][w - weights[i - 1]] + values[i - 1]
        snap(
          `可选：take = ${take}`,
          { i, w, take, skip: dp[i][w], itemIndex0: i - 1 },
          [i - 1],
          4,
          {
            current: [i, w],
            reads: [
              [i - 1, w],
              [i - 1, w - weights[i - 1]],
            ],
          },
          undefined,
          ref('take'),
        )
        if (take > dp[i][w]) {
          dp[i][w] = take
          snap(
            `选物品 ${i} 更优：dp[${i}][${w}] = ${take}`,
            { i, w, take, itemIndex0: i - 1 },
            [i - 1],
            4,
            { current: [i, w], writes: [[i, w]] },
            undefined,
            ref('take'),
          )
        }
      }
    }
  }
  snap(
    `完成：最大价值 = ${dp[n][W]}`,
    { answer: dp[n][W] },
    [],
    0,
    { current: [n, W] },
    { ok: true, maxValue: dp[n][W], n, W },
  )
  return steps
}
