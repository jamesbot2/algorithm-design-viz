import { describe, expect, it } from 'vitest'
import { generateSteps as insertionSteps } from '../src/algorithms/insertionSort'
import { generateSteps as mergeSteps } from '../src/algorithms/mergeSort'

function assertUniqueElementIds(steps: { elementIds?: Record<string, string[]>; arrays?: Record<string, unknown[]> }[]) {
  for (const s of steps) {
    for (const [name, ids] of Object.entries(s.elementIds ?? {})) {
      const set = new Set(ids)
      expect(set.size, `duplicate elementIds in ${name} @ "${(s as { message?: string }).message}" → ${ids.join(',')}`).toBe(
        ids.length,
      )
      expect(ids.length).toBe(s.arrays?.[name]?.length ?? ids.length)
    }
  }
}

describe('V11-02 insert/merge copy identity', () => {
  it('insertionSort [2,1] never emits duplicate elementIds', () => {
    const steps = insertionSteps([2, 1])
    assertUniqueElementIds(steps)
    const shift = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'move' || o.type === 'copy'))
    expect(shift).toBeTruthy()
    // key / temp visible
    const withKey = steps.find((s) => s.vars && 'key' in s.vars)
    expect(withKey).toBeTruthy()
  })

  it('insertionSort [3,2,1] unique ids across all shifts', () => {
    assertUniqueElementIds(insertionSteps([3, 2, 1]))
  })

  it('mergeSort [2,1] unique ids on write-back', () => {
    const steps = mergeSteps([2, 1])
    assertUniqueElementIds(steps)
  })

  it('mergeSort [4,1,3,2] unique ids; buffers/local pointers present on merge', () => {
    const steps = mergeSteps([4, 1, 3, 2])
    assertUniqueElementIds(steps)
    const mergeWrite = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'write' || o.type === 'copy'))
    expect(mergeWrite).toBeTruthy()
    expect(mergeWrite?.arrays?.left || mergeWrite?.arrays?.right || mergeWrite?.vars?.i !== undefined).toBeTruthy()
  })

  it('ops distinguish copy/move/write from swap', () => {
    const ins = insertionSteps([2, 1])
    const ops = ins.flatMap((s) => s.arrayOps?.a ?? [])
    expect(ops.some((o) => o.type === 'swap')).toBe(false)
    expect(ops.some((o) => o.type === 'move' || o.type === 'write')).toBe(true)
    const ms = mergeSteps([2, 1])
    const mops = ms.flatMap((s) => s.arrayOps?.a ?? [])
    expect(mops.some((o) => o.type === 'swap')).toBe(false)
  })
})
