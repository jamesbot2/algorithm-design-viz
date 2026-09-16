import { describe, expect, it } from 'vitest'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import { generateSteps as insertion } from '../src/algorithms/insertionSort'
import { generateSteps as merge } from '../src/algorithms/mergeSort'
import { relocatingElementIds } from '../src/components/ArrayView'

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

  it('insertion move relocates a stable element id (FLIP-eligible)', () => {
    const steps = insertion([2, 1])
    const moveIdx = steps.findIndex((s) => s.arrayOps?.a?.some((o) => o.type === 'move'))
    expect(moveIdx).toBeGreaterThan(0)
    const prev = steps[moveIdx - 1]!.elementIds!.a!
    const next = steps[moveIdx]!.elementIds!.a!
    const moving = relocatingElementIds(prev, next)
    expect(moving.length).toBeGreaterThan(0)
    // Moving id must not be a vacancy placeholder
    expect(moving.every((id) => !id.startsWith('vacant:'))).toBe(true)
  })

  it('merge write from buffer does not claim same-array relocation (instant + buffer viz)', () => {
    const steps = merge([2, 1])
    const writeIdx = steps.findIndex((s) => s.arrayOps?.a?.some((o) => o.type === 'write' || o.type === 'copy'))
    expect(writeIdx).toBeGreaterThan(0)
    const prev = steps[writeIdx - 1]!.elementIds?.a
    const next = steps[writeIdx]!.elementIds!.a!
    const moving = relocatingElementIds(prev, next)
    // Cross-buffer write introduces a new id into `a` — not a same-array FLIP target
    expect(moving.length).toBe(0)
    expect(steps[writeIdx]!.arrays?.left || steps[writeIdx]!.arrays?.right).toBeTruthy()
  })
})
