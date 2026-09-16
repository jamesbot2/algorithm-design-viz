import { describe, expect, it } from 'vitest'
import { generateSteps as kmp } from '../src/algorithms/kmp'
import { generateSteps as lcs } from '../src/algorithms/lcs'
import { generateSteps as bfs } from '../src/algorithms/bfs'
import { generateSteps as dijkstra } from '../src/algorithms/dijkstra'

describe('V11-07 semantic audit (verify, do not invent)', () => {
  it('kmp produces steps with codeRefs and final result shape', () => {
    const steps = kmp([], 'ababc', 'ab')
    expect(steps.length).toBeGreaterThan(2)
    expect(steps.some((s) => (s.codeRefs?.length ?? 0) > 0)).toBe(true)
    const last = steps[steps.length - 1]!
    expect(last.phase === 'done' || last.message.includes('完成') || last.result != null).toBe(true)
  })

  it('lcs DP matrix present throughout', () => {
    const steps = lcs([], 'abc', 'ac')
    expect(steps.every((s) => s.matrices?.dp || s.phase === 'done' || s.result)).toBe(true)
  })

  it('bfs graph steps have graph state', () => {
    const steps = bfs([])
    expect(steps.some((s) => s.graph)).toBe(true)
  })

  it('dijkstra has relax/codeRefs', () => {
    const steps = dijkstra([])
    expect(steps.some((s) => (s.codeRefs?.length ?? 0) > 0)).toBe(true)
  })
})
