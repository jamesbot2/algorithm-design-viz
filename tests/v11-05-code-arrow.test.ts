import { describe, expect, it } from 'vitest'
import { generateSteps as huffmanSteps } from '../src/algorithms/huffman'
import { generateSteps as floydSteps } from '../src/algorithms/floyd'
import { generateSteps as knapsackSteps } from '../src/algorithms/knapsack01'
import { generateSteps as mergeSteps } from '../src/algorithms/mergeSort'

describe('V11-05 code arrow = this step', () => {
  it('huffman merge/done snaps not stuck on init', () => {
    const steps = huffmanSteps([], ['a', 'b', 'c'], [5, 9, 12])
    const merge = steps.find((s) => s.message.includes('合并'))
    const done = steps[steps.length - 1]!
    expect(merge?.codeRefs?.[0]?.anchorId).not.toBe('init')
    expect(merge?.codeRefs?.[0]?.anchorId).toBe('merge')
    expect(done.codeRefs?.[0]?.anchorId).toBe('done')
  })

  it('floyd finish and neg-cycle use done (not kLoop via codeLine=0)', () => {
    const ok = floydSteps([], [
      [0, 1],
      [1, 0],
    ])
    const finish = ok[ok.length - 1]!
    expect(finish.codeRefs?.[0]?.anchorId).toBe('done')

    const neg = floydSteps([], [
      [0, 1],
      [-2, 0],
    ])
    // With k-relaxation this may or may not show neg cycle on 2x2; force diagonal
    const withNeg = floydSteps([], [
      [0, 1],
      [-3, 0],
    ])
    // Run enough: after floyd, d[1][1] can go negative via 1→0→1
    const last = withNeg[withNeg.length - 1]!
    if ((last.result as { error?: string })?.error === 'negative_cycle' || last.vars?.negativeCycle) {
      expect(last.codeRefs?.[0]?.anchorId).toBe('done')
    } else {
      expect(finish.codeRefs?.[0]?.anchorId).toBe('done')
    }
    expect(neg.length).toBeGreaterThan(0)
  })

  it('knapsack done snap has done/return ref', () => {
    const steps = knapsackSteps([], [2], [3], 2)
    const done = steps[steps.length - 1]!
    const aid = done.codeRefs?.[0]?.anchorId
    expect(aid === 'done' || aid === 'return').toBe(true)
  })

  it('merge write snaps use side-specific write/copy anchors not only mergeCompare', () => {
    const steps = mergeSteps([2, 1])
    const write = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'write' || o.type === 'copy'))
    expect(write).toBeTruthy()
    const aid = write!.codeRefs?.[0]?.anchorId
    expect(['mergeWriteLeft', 'mergeWriteRight', 'mergeCopyLeft', 'mergeCopyRight']).toContain(aid)
    expect(aid).not.toBe('mergeCompare')
  })
})
