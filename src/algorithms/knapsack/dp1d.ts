import type { Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'

/** Correct 0-1 knapsack 1D: iterate capacity descending. */
export function solveDp1dCorrect(inst: KnapsackInstance): KnapsackSolution & { steps: Step[] } {
  const { items, capacity: W } = inst
  const DOC = 'knapsack.dp1dCorrect.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const dp = Array(W + 1).fill(0)
  const steps: Step[] = []
  let id = 0
  steps.push({
    id: id++,
    message: '初始化一维 dp（逆序更新）',
    arrays: { dp: [...dp] },
    phase: 'init',
    codeRefs: ref('init'),
  })
  for (const it of items) {
    for (let w = W; w >= it.weight; w--) {
      const prev = dp[w]
      dp[w] = Math.max(dp[w], dp[w - it.weight] + it.value)
      if (w === W || w === it.weight) {
        steps.push({
          id: id++,
          message: `物品 ${it.id}：逆序 w=${w} dp=${dp[w]}（原 ${prev}）`,
          arrays: { dp: [...dp] },
          vars: { w, item: it.id },
          phase: 'reverse',
          codeRefs: ref('reverse'),
        })
      }
    }
    steps.push({
      id: id++,
      message: `完成物品 ${it.id} 滚动`,
      arrays: { dp: [...dp] },
      codeRefs: ref('update'),
    })
  }
  steps.push({
    id: id++,
    message: `正确一维最优值 ${dp[W]}`,
    arrays: { dp: [...dp] },
    result: { ok: true, maxValue: dp[W], method: 'dp1d' },
    codeRefs: ref('done'),
  })
  return { ok: true, maxValue: dp[W], method: 'dp1d', steps }
}

/**
 * WRONG forward-update (treats as unbounded / multi-use).
 * Counterexample: item w=2 v=3, W=4 → yields 6 instead of 3.
 */
export function solveDp1dWrongForward(inst: KnapsackInstance): KnapsackSolution & {
  isCounterexample: true
  correctValue: number
  steps: Step[]
} {
  const { items, capacity: W } = inst
  const DOC = 'knapsack.dp1dWrong.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const dp = Array(W + 1).fill(0)
  const steps: Step[] = []
  let id = 0
  steps.push({
    id: id++,
    message: '【反例】正向更新一维 dp（错误）',
    arrays: { dp: [...dp] },
    labelHints: { antiExample: true, antiNote: '正向更新把 0-1 算成可重复选取' },
    codeRefs: ref('init'),
  })
  for (const it of items) {
    for (let w = it.weight; w <= W; w++) {
      dp[w] = Math.max(dp[w], dp[w - it.weight] + it.value)
      if (w === W || w === it.weight) {
        steps.push({
          id: id++,
          message: `【反例】正向 w=${w} dp=${dp[w]}（物品 ${it.id}）`,
          arrays: { dp: [...dp] },
          vars: { w, item: it.id },
          codeRefs: ref('forward'),
          labelHints: { antiExample: true },
        })
      }
    }
  }
  const correct = solveDp1dCorrect(inst).maxValue
  const solution = {
    ok: true as const,
    maxValue: dp[W],
    method: 'dp1d-wrong-forward',
    note: '反例：正向更新把 0-1 背包算成可重复选取',
    isCounterexample: true as const,
    correctValue: correct,
    steps,
  }
  steps.push({
    id: id++,
    message: `【反例】得 ${dp[W]}（正确应为 ${correct}）`,
    arrays: { dp: [...dp] },
    result: solution,
    codeRefs: ref('done'),
    labelHints: { antiExample: true, antiNote: '结果不可信' },
  })
  return solution
}
