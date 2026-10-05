import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import { generateSteps as quick } from '../src/algorithms/quickSort'
import { relocatingElementIds } from '../src/components/ArrayView'

describe('V29 M2 swap identity + interrupt contract (source)', () => {
  const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
  const ctl = readFileSync(resolve(__dirname, '../src/components/workbench/usePlaybackController.ts'), 'utf8')

  it('bar columns are keyed by element id (not slot index)', () => {
    expect(av).toMatch(/key=\{eid\}/)
    expect(av).not.toMatch(/key=\{`slot-\$\{i\}`\}/)
    expect(av).not.toMatch(/key=\{slotKey\}/)
  })

  it('FLIP uses WAAPI with no-overshoot easing and same-row horizontal-only', () => {
    expect(av).toMatch(/layer\.animate\(/)
    expect(av).toMatch(/cubic-bezier\(0\.2, 0, 0, 1\)/)
    expect(av).toMatch(/Math\.abs\(dyRaw\) < 4 \? 0/)
    expect(av).toMatch(/selfSwap/)
  })

  it('pause does not bump transitionEpoch; seek/reset still do', () => {
    expect(ctl).toMatch(/freeze mid-motion/)
    expect(ctl).not.toMatch(/if \(playing\) \{\s*setPlaying\(false\)\s*bumpTransitionEpoch/s)
    expect(ctl).toMatch(/setPlaybackPlaying\(playing\)/)
  })

  it('bubble/quickswap steps relocate stable element ids (not value-guessed)', () => {
    for (const gen of [bubble, quick]) {
      const steps = gen([4, 1, 3, 2])
      let swaps = 0
      for (let i = 1; i < steps.length; i++) {
        const op = steps[i]!.arrayOps?.a?.find((o) => o.type === 'swap')
        if (!op) continue
        swaps++
        const [a, b] = op.indices
        // quickSort may emit i==i "swap" markers — no travel expected
        if (a === b) continue
        const prev = steps[i - 1]!.elementIds!.a!
        const next = steps[i]!.elementIds!.a!
        const moving = relocatingElementIds(prev, next)
        expect(moving.length).toBeGreaterThanOrEqual(2)
        expect(new Set(next).size).toBe(next.length)
      }
      expect(swaps).toBeGreaterThan(0)
    }
  })
})
