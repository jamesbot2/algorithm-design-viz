import { describe, expect, it } from 'vitest'
import { solveHuffman } from '../src/algorithms/huffman'

describe('V11-06 Huffman forest', () => {
  it('emits searchTree forest on merge steps', () => {
    const { steps, result } = solveHuffman(['a', 'b', 'c'], [5, 9, 12])
    expect(result.ok).toBe(true)
    const merge = steps.find((s) => s.message.includes('合并'))
    expect(merge?.searchTree).toBeTruthy()
    expect(merge?.searchTree?.children?.length).toBeGreaterThan(0)
  })

  it('aggregates duplicate symbols by default', () => {
    const { result } = solveHuffman(['a', 'a', 'b'], [1, 2, 3])
    expect(result.ok).toBe(true)
    expect(result.codes.a).toBeDefined()
    expect(Object.keys(result.codes).length).toBe(2)
  })

  it('rejects duplicates when onDuplicate=reject', () => {
    const { result } = solveHuffman(['a', 'a'], [1, 2], { onDuplicate: 'reject' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('duplicate_symbol')
  })

  it('does not claim heap complexity; WPL from tree', () => {
    const { steps, result } = solveHuffman(['a', 'b', 'c', 'd'], [1, 2, 3, 4])
    expect(result.wpl).toBeGreaterThan(0)
    expect(result.complexityNote || steps.some((s) => String(s.vars?.method).includes('sort'))).toBeTruthy()
  })
})
