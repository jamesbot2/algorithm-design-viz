import { describe, expect, it } from 'vitest'
import { computeBarGeometry } from '../src/components/ArrayView'
import { generateSteps as kadaneSteps } from '../src/algorithms/kadane'

describe('V11-01 signed bars geometry', () => {
  it('[5,-5,0] equal |v| length; zero height 0; shared domain', () => {
    const g = computeBarGeometry([5, -5, 0])
    expect(g.heights[0]).toBe(g.heights[1])
    expect(g.heights[2]).toBe(0)
    expect(g.directions).toEqual(['pos', 'neg', 'zero'])
    expect(g.zeroRatio).toBe(0.5)
  })

  it('[-8,-2,-5] all-neg; proportional heights; zero at top', () => {
    const g = computeBarGeometry([-8, -2, -5])
    expect(g.zeroRatio).toBe(0)
    expect(g.heights[0]! / g.heights[1]!).toBeCloseTo(4, 5)
    expect(g.directions.every((d) => d === 'neg')).toBe(true)
  })

  it('[0,0,0] all zero heights', () => {
    const g = computeBarGeometry([0, 0, 0])
    expect(g.heights).toEqual([0, 0, 0])
  })

  it('[1,10,100] stable scale when max vanishes mid-trajectory', () => {
    const trajMax = 100
    const mid = computeBarGeometry([1, 10, 1], trajMax)
    const end = computeBarGeometry([1, 1, 1], trajMax)
    expect(mid.absMax).toBe(100)
    expect(end.absMax).toBe(100)
    expect(mid.heights[1]! / mid.heights[0]!).toBeCloseTo(10, 5)
  })

  it('[-3,0,4,-1] mixed signs', () => {
    const g = computeBarGeometry([-3, 0, 4, -1], 4)
    expect(g.heights[2]).toBeGreaterThan(g.heights[0]!)
    expect(g.heights[1]).toBe(0)
    expect(g.directions[0]).toBe('neg')
    expect(g.directions[2]).toBe('pos')
  })

  it('kadane trajectory scaleMax covers peak abs', () => {
    const steps = kadaneSteps([-2, 1, -3, 4, -1, 2, 1, -5, 4])
    let peak = 1
    for (const s of steps) {
      for (const v of s.arrays?.a ?? []) {
        if (typeof v === 'number') peak = Math.max(peak, Math.abs(v))
      }
    }
    expect(peak).toBeGreaterThanOrEqual(4)
  })
})
