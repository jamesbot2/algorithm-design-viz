import { describe, expect, it } from 'vitest'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import {
  eventPhaseSegments,
  segmentGeometry,
  teachableStages,
} from '../src/utils/teachableStages'

describe('UI-01 timeline geometry (N-normalization)', () => {
  it('1-step: segment fills [0,100] without overflow', () => {
    const g = segmentGeometry(0, 0, 1)
    expect(g.leftPct + g.widthPct).toBeLessThanOrEqual(100)
    expect(g.leftPct).toBe(0)
    expect(g.widthPct).toBe(100)
  })

  it('2-step: last segment left+width ≤ 100% (not 100–200%)', () => {
    // Old bug: max=N-1=1 → start/max*100=100, width=(1-1+1)/1*100=100 → 200%
    const last = segmentGeometry(1, 1, 2)
    expect(last.leftPct + last.widthPct).toBeLessThanOrEqual(100 + 1e-9)
    expect(last.leftPct).toBe(50)
    expect(last.widthPct).toBe(50)
  })

  it('default bubble 7 elems: teachable stage buttons bounded, events collapse', () => {
    const steps = bubble([5, 2, 8, 1, 9, 3, 7])
    expect(steps.length).toBe(50)
    const events = eventPhaseSegments(steps)
    // Old UI used event segments as jump buttons (~30)
    expect(events.length).toBeGreaterThan(8)
    const { direct, all } = teachableStages(steps, 8)
    expect(direct.length).toBeLessThanOrEqual(8)
    expect(all.length).toBeLessThan(events.length)
    // All steps reachable via stage ranges
    expect(all[0]!.start).toBe(0)
    expect(all[all.length - 1]!.end).toBe(steps.length - 1)
  })

  it('32 reversed: teachable direct ≤ 8; track segments stay in bounds', () => {
    const arr = Array.from({ length: 32 }, (_, i) => 32 - i)
    const steps = bubble(arr)
    expect(steps.length).toBe(1025)
    const { direct, all } = teachableStages(steps, 8)
    expect(direct.length).toBeLessThanOrEqual(8)
    const n = steps.length
    for (const seg of all) {
      const g = segmentGeometry(seg.start, seg.end, n)
      expect(g.leftPct + g.widthPct).toBeLessThanOrEqual(100 + 1e-9)
    }
  })

  it('empty / single-frame preview: geometry safe', () => {
    expect(segmentGeometry(0, 0, 0).widthPct).toBe(0)
    const g = segmentGeometry(0, 0, 1)
    expect(g.leftPct + g.widthPct).toBe(100)
  })
})
