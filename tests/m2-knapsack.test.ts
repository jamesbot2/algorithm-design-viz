import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INSTANCE,
  FORWARD_UPDATE_COUNTEREXAMPLE,
  GREEDY_COUNTEREXAMPLE,
  bruteForceKnapsack,
  greedyByDensity,
  fractionalGreedy,
  solveDp1dCorrect,
  solveDp1dWrongForward,
  solveDp2d,
  solveBacktracking,
  solveBranchAndBound,
  validateKnapsackInstance,
} from '../src/algorithms/knapsack'

describe('M2 knapsack multi-strategy', () => {
  it('validate accepts empty items and W=0', () => {
    expect(validateKnapsackInstance({ items: [], capacity: 0 }).ok).toBe(true)
  })

  it('strategies agree on optimal for default instance', () => {
    const inst = DEFAULT_INSTANCE
    const bf = bruteForceKnapsack(inst)
    const dp = solveDp2d(inst).solution
    const d1 = solveDp1dCorrect(inst)
    const bt = solveBacktracking(inst).solution
    const bb = solveBranchAndBound(inst).solution
    expect(bf.maxValue).toBe(dp.maxValue)
    expect(d1.maxValue).toBe(dp.maxValue)
    expect(bt.maxValue).toBe(dp.maxValue)
    expect(bb.maxValue).toBe(dp.maxValue)
  })

  it('forward-update counterexample w=2 v=3 W=4 → wrong 6 vs correct 3', () => {
    const wrong = solveDp1dWrongForward(FORWARD_UPDATE_COUNTEREXAMPLE)
    expect(wrong.maxValue).toBe(6)
    expect(wrong.correctValue).toBe(3)
    expect(solveDp1dCorrect(FORWARD_UPDATE_COUNTEREXAMPLE).maxValue).toBe(3)
  })

  it('greedy density counterexample → 160 vs opt 220; fractional differs', () => {
    const g = greedyByDensity(GREEDY_COUNTEREXAMPLE)
    const opt = bruteForceKnapsack(GREEDY_COUNTEREXAMPLE)
    const frac = fractionalGreedy(GREEDY_COUNTEREXAMPLE)
    expect(g.maxValue).toBe(160)
    expect(opt.maxValue).toBe(220)
    expect(frac.value).toBeGreaterThanOrEqual(220)
  })

  it('dp2d reconstructs a feasible optimal set', () => {
    const { solution } = solveDp2d(DEFAULT_INSTANCE)
    const byId = Object.fromEntries(DEFAULT_INSTANCE.items.map((i) => [i.id, i]))
    let w = 0
    let v = 0
    for (const id of solution.selectedIds ?? []) {
      w += byId[id]!.weight
      v += byId[id]!.value
    }
    expect(w).toBeLessThanOrEqual(DEFAULT_INSTANCE.capacity)
    expect(v).toBe(solution.maxValue)
  })
})
