import type { KnapsackInstance, KnapsackSolution } from './types'

/** Correct 0-1 knapsack 1D: iterate capacity descending. */
export function solveDp1dCorrect(inst: KnapsackInstance): KnapsackSolution {
  const { items, capacity: W } = inst
  const dp = Array(W + 1).fill(0)
  for (const it of items) {
    for (let w = W; w >= it.weight; w--) {
      dp[w] = Math.max(dp[w], dp[w - it.weight] + it.value)
    }
  }
  return { ok: true, maxValue: dp[W], method: 'dp1d' }
}

/**
 * WRONG forward-update (treats as unbounded / multi-use).
 * Counterexample: item w=2 v=3, W=4 → yields 6 instead of 3.
 */
export function solveDp1dWrongForward(inst: KnapsackInstance): KnapsackSolution & {
  isCounterexample: true
  correctValue: number
} {
  const { items, capacity: W } = inst
  const dp = Array(W + 1).fill(0)
  for (const it of items) {
    for (let w = it.weight; w <= W; w++) {
      dp[w] = Math.max(dp[w], dp[w - it.weight] + it.value)
    }
  }
  const correct = solveDp1dCorrect(inst).maxValue
  return {
    ok: true,
    maxValue: dp[W],
    method: 'dp1d-wrong-forward',
    note: '反例：正向更新把 0-1 背包算成可重复选取',
    isCounterexample: true,
    correctValue: correct,
  }
}
