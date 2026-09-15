import type { Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'

export function solveDp2d(inst: KnapsackInstance): {
  solution: KnapsackSolution
  dp: number[][]
  steps: Step[]
} {
  const { items, capacity: W } = inst
  const n = items.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0))
  const steps: Step[] = []
  const DOC = 'knapsack.dp2d.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const weights = items.map((i) => i.weight)
  const values = items.map((i) => i.value)

  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    targets?: {
      current?: [number, number]
      reads?: [number, number][]
      writes?: [number, number][]
      path?: [number, number][]
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
      vars: { n, W, ...vars },
      result,
      codeRefs,
    })
  }

  snap('初始化 dp[0..n][0..W]=0（伪多项式 O(nW)）', {}, undefined, undefined, ref('init'))
  for (let i = 1; i <= n; i++) {
    const wt = items[i - 1]!.weight
    const val = items[i - 1]!.value
    for (let w = 0; w <= W; w++) {
      dp[i]![w] = dp[i - 1]![w]!
      let took = false
      if (w >= wt) {
        const take = dp[i - 1]![w - wt]! + val
        if (take > dp[i]![w]!) {
          dp[i]![w] = take
          took = true
        }
      }
      if (w === W || w % Math.max(1, Math.floor(W / 4)) === 0) {
        snap(
          `填 dp[${i}][${w}]=${dp[i]![w]}（物品 ${items[i - 1]!.id}）`,
          { i, w },
          {
            current: [i, w],
            writes: [[i, w]],
            reads: w >= wt ? [[i - 1, w], [i - 1, w - wt]] : [[i - 1, w]],
          },
          undefined,
          took ? ref('take') : ref('fill'),
        )
      }
    }
  }

  const selectedIds: string[] = []
  let w = W
  const path: [number, number][] = [[n, W]]
  snap('开始回溯重构选中物品', { phase: 'reconstruct' }, { current: [n, W] }, undefined, ref('reconstruct'))
  for (let i = n; i >= 1; i--) {
    if (dp[i]![w] !== dp[i - 1]![w]) {
      selectedIds.push(items[i - 1]!.id)
      w -= items[i - 1]!.weight
      path.push([i - 1, w])
    } else {
      path.push([i - 1, w])
    }
  }
  selectedIds.reverse()
  const maxValue = dp[n]![W]!
  const solution: KnapsackSolution = {
    ok: true,
    maxValue,
    selectedIds,
    method: 'dp2d',
  }
  snap(
    `完成：最优值 ${maxValue}；回溯选中 [${selectedIds.join(', ')}]`,
    { answer: maxValue },
    { current: [n, W], path },
    solution,
    ref('done'),
  )
  return { solution, dp, steps }
}
