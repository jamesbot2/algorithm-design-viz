import { describe, expect, it, vi } from 'vitest'
import { getPresentation, resolvePresentation } from '../src/components/presentation/presentation'
import { algorithms } from '../src/algorithms'
import * as huffman from '../src/algorithms/huffman'
import * as mergeSort from '../src/algorithms/mergeSort'
import { splitIntervalLabel } from '../src/components/ArrayView'
import type { Step } from '../src/types/step'

describe('V24 presentation contract (presentation only)', () => {
  it('mixed-snapshot modules declare their teaching primary explicitly', () => {
    expect(getPresentation('mergeSort')).toMatchObject({ primaryKind: 'array', primaryKey: 'a', companions: ['left', 'right'] })
    expect(getPresentation('mergeSort')!.auxiliaries?.[0]).toMatchObject({ id: 'recursion-tree' })
    expect(getPresentation('huffman')).toMatchObject({ primaryKind: 'forest', inputTable: ['symbols', 'freqs'] })
    expect(getPresentation('activitySelection')).toMatchObject({ primaryKind: 'array', primaryKey: 'activities', labelFormat: { activities: 'interval-card' } })
    expect(getPresentation('insertionSort')).toMatchObject({ primaryKind: 'array', primaryKey: 'a' })
    expect(getPresentation('quickSort')).toMatchObject({ primaryKind: 'array', primaryKey: 'a' })
    // search / backtracking stays tree- or board-primary (not a generic "fold every tree")
    expect(getPresentation('nQueens')).toMatchObject({ primaryKind: 'board' })
    expect(getPresentation('knapsack:backtracking')).toMatchObject({ primaryKind: 'search-tree' })
    expect(getPresentation('knapsack:branchAndBound')).toMatchObject({ primaryKind: 'search-tree' })
  })

  it('simple modules keep the legacy inference', () => {
    for (const id of ['lcs', 'dijkstra', 'bubbleSort', 'kadane', 'floyd']) expect(getPresentation(id)).toBeUndefined()
    const lcsStep = algorithms.lcs!.generateSteps([])[3]!
    expect(resolvePresentation('lcs', lcsStep, false, true).scene).toBe('matrix')
    const dij = algorithms.dijkstra!.generateSteps([])[2]!
    expect(resolvePresentation('dijkstra', dij, false, false).scene).toBe('graph')
  })

  it('Huffman primary is the forest on EVERY frame (with or without arrays / forest)', () => {
    const steps = huffman.solveHuffman(['a', 'b', 'c', 'd', 'e'], [5, 9, 12, 13, 16]).steps
    expect(steps.length).toBe(10)
    for (const s of steps) expect(resolvePresentation('huffman', s, false, false).scene).toBe('forest')
    // a frame without a forest snapshot does not flip the view either
    const bare: Step = { id: 0, message: 'x', arrays: { symbols: ['a'], freqs: [1] } }
    expect(resolvePresentation('huffman', bare, false, false).scene).toBe('forest')
  })

  it('merge primary is array a on every frame even though every frame carries a searchTree', () => {
    const steps = mergeSort.generateSteps([5, 2, 8, 1, 9, 3, 7])
    expect(steps.length).toBe(55)
    expect(steps.every((s) => s.searchTree)).toBe(true)
    for (const s of steps) expect(resolvePresentation('mergeSort', s, false, false).scene).toBe('array')
  })

  it('resolving a presentation never solves (pure function of descriptor + frame)', () => {
    const spy = vi.spyOn(algorithms.mergeSort!, 'generateSteps')
    const steps = mergeSort.generateSteps([4, 1, 3, 2])
    spy.mockClear()
    for (const s of steps) resolvePresentation('mergeSort', s, false, false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('interval labels split into id + [start,finish) verbatim (endpoints kept)', () => {
    expect(splitIntervalLabel('A0[1,4)')).toEqual({ id: 'A0', range: '[1,4)' })
    expect(splitIntervalLabel('A12[10,105)')).toEqual({ id: 'A12', range: '[10,105)' })
    expect(splitIntervalLabel('plain')).toEqual({ id: 'plain', range: '' })
  })

  it('declaring a presentation did not change any result (solver output snapshot)', () => {
    const merge = mergeSort.generateSteps([5, 2, 8, 1, 9, 3, 7])
    expect(merge[merge.length - 1]!.arrays!.a).toEqual([1, 2, 3, 5, 7, 8, 9])
    const h = huffman.solveHuffman(['a', 'b', 'c', 'd', 'e'], [5, 9, 12, 13, 16]).result
    expect(h.wpl).toBe(124)
    expect(h.codes).toEqual({ a: "100", b: "101", c: "00", d: "01", e: "11" })
    const act = algorithms.activitySelection!.generateSteps([])
    expect(act[act.length - 1]!.vars!.answer).toBe(3)
  })
})
