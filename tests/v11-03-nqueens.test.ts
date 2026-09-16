import { describe, expect, it } from 'vitest'
import { solveNQueens } from '../src/algorithms/nQueens'

/** Classic N-Queens solution counts */
const ORACLE: Record<number, number> = { 1: 1, 2: 0, 3: 0, 4: 2, 5: 10, 8: 92 }

describe('V11-03 N-Queens path/board/end/sampling', () => {
  for (const n of [1, 2, 3, 4, 5, 8]) {
    it(`n=${n} solution count matches oracle ${ORACLE[n]}`, () => {
      const { result } = solveNQueens(n, 'all', { maxNodes: 2_000_000, maxSolutions: 100_000 })
      expect(result.complete).toBe(true)
      expect(result.solutionCount).toBe(ORACLE[n])
    })
  }

  it('every step with searchTree exposes activePathIds (explicit)', () => {
    const { steps } = solveNQueens(4, 'all')
    for (const s of steps) {
      if (!s.searchTree) continue
      expect(Array.isArray(s.activePathIds)).toBe(true)
      expect((s.activePathIds ?? []).length).toBeGreaterThan(0)
    }
  })

  it('terminal done step keeps matrices.board', () => {
    const { steps } = solveNQueens(4, 'one')
    const done = steps[steps.length - 1]!
    expect(done.phase).toBe('done')
    expect(done.matrices?.board).toBeTruthy()
    expect(done.matrices!.board!.length).toBe(4)
  })

  it('separates computationComplete vs traceComplete; labels sampling gaps', () => {
    const { result, steps } = solveNQueens(5, 'all', { maxNodes: 200_000, maxSolutions: 10_000 })
    expect(result.complete).toBe(true)
    const done = steps[steps.length - 1]!
    expect(done.vars?.computationComplete === true || done.vars?.complete === true).toBe(true)
    // If trace was sampled, must be labeled
    if (done.vars?.traceComplete === false || done.vars?.traceSampled === true) {
      expect(String(done.message).includes('采样') || done.vars?.traceSampled === true).toBe(true)
    }
  })

  it('stats do not misuse comparisons/writes as nodes/pruned', () => {
    const { steps } = solveNQueens(4, 'all')
    const mid = steps.find((s) => s.phase === 'place' || s.phase === 'conflict')
    expect(mid).toBeTruthy()
    // Prefer btNodes/prunedNodes in vars; stats.comparisons should not be the only node counter label
    expect(mid!.vars?.nodes !== undefined || mid!.vars?.btNodes !== undefined).toBe(true)
  })

  it('place events carry row/col; path not inferred solely from exploring child', () => {
    const { steps } = solveNQueens(4, 'one')
    const place = steps.find((s) => s.phase === 'place')
    expect(place).toBeTruthy()
    expect(typeof place!.vars?.row === 'number' && typeof place!.vars?.col === 'number').toBe(true)
  })
})
