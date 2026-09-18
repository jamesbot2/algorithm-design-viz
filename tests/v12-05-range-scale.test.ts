import { describe, expect, it } from 'vitest'
import { computeBarGeometry } from '../src/components/ArrayView'

describe('V12-05 stable run-level bar scale', () => {
  it('[1,-1] then mid [1,1] keeps same height for value 1 with runDomain', () => {
    const run = { hasPos: true, hasNeg: true }
    const a = computeBarGeometry([1, -1], 1, 160, run)
    const b = computeBarGeometry([1, 1], 1, 160, run)
    expect(a.heights[0]).toBeCloseTo(b.heights[0], 5)
    const naive = computeBarGeometry([1, 1], 1, 160)
    expect(naive.heights[0]).toBeGreaterThan(b.heights[0] + 1)
  })
})
