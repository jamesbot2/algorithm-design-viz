import { describe, expect, it } from 'vitest'
import {
  createArrayPreview,
  createDpMatrixPreview,
  createNQueensPreview,
  createKnapsackPreview,
} from '../src/preview/createPreview'

describe('V4 createPreview helpers', () => {
  it('array preview shows indices readiness', () => {
    const s = createArrayPreview({ arr: [3, 1, 4] })
    expect(s.arrays?.a).toEqual([3, 1, 4])
    expect(s.phase).toBe('preview')
  })

  it('DP preview distinguishes unset vs 0 (null cells)', () => {
    const s = createDpMatrixPreview({ rows: 3, cols: 3, name: 'dp' })
    const mat = s.matrices!.dp
    expect(mat[1]![1]).toBeNull()
  })

  it('n-queens empty board', () => {
    const s = createNQueensPreview({ n: 4 })
    expect(s.matrices!.board).toHaveLength(4)
    expect(s.matrices!.board[0]!.every((c) => c === null)).toBe(true)
  })

  it('knapsack preview size-capped', () => {
    const s = createKnapsackPreview({
      weights: Array.from({ length: 40 }, (_, i) => i + 1),
      values: Array.from({ length: 40 }, (_, i) => i),
      capacity: 10,
    })
    expect((s.arrays!.weights as number[]).length).toBeLessThanOrEqual(16)
  })
})
