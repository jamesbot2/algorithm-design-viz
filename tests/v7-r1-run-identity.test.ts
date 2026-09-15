import { describe, expect, it } from 'vitest'
import {
  makeRunIdentity,
  isRunCurrent,
  isDraftDirtyVersusSnapshot,
} from '../src/core/runner/runIdentity'

describe('V7 R1 run identity', () => {
  it('makeRunIdentity freezes fields and isRunCurrent matches only same triple', () => {
    const a = makeRunIdentity({
      generation: 1,
      algoId: 'nQueens',
      inputSnapshot: { n: 8 },
      inputRevision: 0,
      runId: 'ui-1-a',
    })
    expect(Object.isFrozen(a)).toBe(true)
    expect(isRunCurrent(a, a)).toBe(true)
    expect(
      isRunCurrent(
        a,
        makeRunIdentity({
          generation: 2,
          algoId: 'nQueens',
          inputSnapshot: { n: 8 },
          inputRevision: 0,
          runId: 'ui-1-a',
        }),
      ),
    ).toBe(false)
    expect(
      isRunCurrent(
        a,
        makeRunIdentity({
          generation: 1,
          algoId: 'dijkstra',
          inputSnapshot: { n: 8 },
          inputRevision: 0,
          runId: 'ui-1-a',
        }),
      ),
    ).toBe(false)
    expect(isRunCurrent(a, null)).toBe(false)
    expect(isRunCurrent(null, a)).toBe(false)
  })

  it('dirty compares draft slice vs snapshot input', () => {
    expect(isDraftDirtyVersusSnapshot({ n: 9 }, { n: 8 })).toBe(true)
    expect(isDraftDirtyVersusSnapshot({ n: 8 }, { n: 8 })).toBe(false)
  })
})
