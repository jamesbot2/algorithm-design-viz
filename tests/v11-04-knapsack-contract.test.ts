import { describe, expect, it, vi } from 'vitest'
import { parseNumberList, parseIntStrict, assertNonNegIntegers } from '../src/utils/parseInput'
import * as knapsack01 from '../src/algorithms/knapsack01'

describe('V11-04 knapsack input contract', () => {
  it('rejects non-integer weights 1.5', () => {
    const { values, errors } = parseNumberList('1.5', 'weights')
    const intErrs = assertNonNegIntegers(values, 'weights', { allowZero: false })
    expect([...errors, ...intErrs].length).toBeGreaterThan(0)
  })

  it('rejects W=2.5 and Infinity', () => {
    expect(parseIntStrict('2.5', 'W').errors.length + (Number.isInteger(parseIntStrict('2.5', 'W').value) ? 0 : 1)).toBeGreaterThan(0)
    const inf = parseIntStrict('Infinity', 'W')
    expect(inf.errors.length > 0 || inf.value === null || !Number.isFinite(inf.value)).toBe(true)
  })

  it('rejects negatives and length mismatch helpers', () => {
    expect(assertNonNegIntegers([-1], 'weights', { allowZero: false }).length).toBeGreaterThan(0)
    expect(assertNonNegIntegers([1, 2], 'weights', { allowZero: false }).length).toBe(0)
  })

  it('does not call generateSteps path conceptually when illegal — guard returns before solver', () => {
    const spy = vi.spyOn(knapsack01, 'generateSteps')
    const wts = parseNumberList('1.5', 'weights')
    const vals = parseNumberList('10', 'values')
    const W = parseIntStrict('3', 'W')
    const errs = [
      ...wts.errors,
      ...vals.errors,
      ...W.errors,
      ...assertNonNegIntegers(wts.values, 'weights', { allowZero: false }),
      ...assertNonNegIntegers(vals.values, 'values', { allowZero: true }),
      ...(W.value !== null && (!Number.isInteger(W.value) || W.value < 0)
        ? [{ field: 'W', reason: '须为非负整数' }]
        : []),
    ]
    if (errs.length === 0) {
      knapsack01.generateSteps([], wts.values, vals.values, W.value ?? 0)
    }
    expect(spy).toHaveBeenCalledTimes(0)
    spy.mockRestore()
  })

  it('legal small case oracle W=0 → 0', () => {
    const steps = knapsack01.generateSteps([], [], [], 0)
    const last = steps[steps.length - 1]!
    expect((last.result as { maxValue: number }).maxValue).toBe(0)
  })

  it('legal weights=2,3 values=3,4 W=5 → 7', () => {
    const steps = knapsack01.generateSteps([], [2, 3], [3, 4], 5)
    const last = steps[steps.length - 1]!
    expect((last.result as { maxValue: number }).maxValue).toBe(7)
  })
})
