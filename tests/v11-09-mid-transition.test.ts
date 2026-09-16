import { describe, expect, it } from 'vitest'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import { generateSteps as insertion } from '../src/algorithms/insertionSort'
import { generateSteps as merge } from '../src/algorithms/mergeSort'

/** Mid-transition sampling: adjacent steps with explicit ops must differ in geometry identity. */
describe('V11-09 mid-transition step pairs', () => {
  it('bubble swap pair has prev≠next arrays with swap op', () => {
    const steps = bubble([3, 1, 2])
    let found = false
    for (let i = 1; i < steps.length; i++) {
      const op = steps[i]!.arrayOps?.a?.find((o) => o.type === 'swap')
      if (!op) continue
      found = true
      expect(steps[i]!.arrays?.a).not.toEqual(steps[i - 1]!.arrays?.a)
    }
    expect(found).toBe(true)
  })

  it('insertion move mid-state shows temp + unique ids', () => {
    const steps = insertion([2, 1])
    const moveIdx = steps.findIndex((s) => s.arrayOps?.a?.some((o) => o.type === 'move'))
    expect(moveIdx).toBeGreaterThan(0)
    const mid = steps[moveIdx]!
    expect(mid.arrays?.temp).toBeTruthy()
    const ids = mid.elementIds!.a!
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('merge copy/write mid-state exposes buffers', () => {
    const steps = merge([2, 1])
    const w = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'write' || o.type === 'copy'))!
    expect(w.arrays?.left || w.arrays?.right).toBeTruthy()
  })
})
