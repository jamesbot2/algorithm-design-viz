import { describe, expect, it } from 'vitest'
import { generateSteps, validateSorted } from '../src/algorithms/binarySearch'

describe('P0-02 binarySearch', () => {
  it('does not silently sort unsorted [3,1,2] looking for 3', () => {
    const steps = generateSteps([3, 1, 2], 3, 'requireSorted')
    expect(steps[0]?.result).toMatchObject({ ok: false, error: 'unsorted' })
    expect(steps.some((s) => s.message.includes('找到'))).toBe(false)
    // array in first step remains unsorted
    expect(steps[0]?.arrays?.a).toEqual([3, 1, 2])
  })

  it('validateSorted detects disorder', () => {
    expect(validateSorted([3, 1, 2])).toBe(false)
    expect(validateSorted([1, 2, 3])).toBe(true)
    expect(validateSorted([1, 1, 2])).toBe(true)
  })

  it('empty array', () => {
    const steps = generateSteps([], 1, 'requireSorted')
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ foundIndex: null })
  })

  it('single element hit/miss', () => {
    const hit = generateSteps([7], 7, 'requireSorted')
    expect(hit[hit.length - 1]!.result).toMatchObject({ foundIndex: 0 })
    const miss = generateSteps([7], 3, 'requireSorted')
    expect(miss[miss.length - 1]!.result).toMatchObject({ foundIndex: null })
  })

  it('ends', () => {
    const a = [1, 3, 5, 7, 9]
    expect(generateSteps(a, 1)[generateSteps(a, 1).length - 1]!.result).toMatchObject({
      foundIndex: 0,
    })
    expect(generateSteps(a, 9)[generateSteps(a, 9).length - 1]!.result).toMatchObject({
      foundIndex: 4,
    })
  })

  it('duplicates return leftmost', () => {
    const steps = generateSteps([1, 2, 2, 2, 5], 2, 'requireSorted')
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ foundIndex: 1 })
  })

  it('sortThenSearch shows sort phase and finds with original index', () => {
    const steps = generateSteps([3, 1, 2], 3, 'sortThenSearch')
    expect(steps.some((s) => String(s.vars?.phase) === 'sort' || s.message.includes('排序'))).toBe(
      true,
    )
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ foundIndex: 2, originalIndex: 0 })
  })

  it('comparisons count mid value compares only', () => {
    const steps = generateSteps([1, 2, 3, 4, 5, 6, 7], 7, 'requireSorted')
    const last = steps[steps.length - 1]!
    const comps = last.stats?.comparisons ?? 0
    // log2(7)≈3, leftmost path a few more; must be small and equal to mid snaps with 值比较
    expect(comps).toBeGreaterThan(0)
    expect(comps).toBeLessThanOrEqual(7)
  })
})
