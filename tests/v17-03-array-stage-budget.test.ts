import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V17-03 array/DP stage budget', () => {
  const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
  const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

  it('main array maxBudget is not hard-coded desktop 160', () => {
    // Old: const maxBudget = ... : 160
    expect(av).not.toMatch(
      /const maxBudget = landscape && ultra \? 240 : landscape && short \? 220 : short \? 180 : 160/,
    )
    expect(av).toMatch(/stageBudget/)
    expect(av).toMatch(/V17-03/)
  })

  it('aux buffers stay compact (BUFFER_ARRAY_NAMES + compact=true)', () => {
    expect(av).toMatch(/BUFFER_ARRAY_NAMES/)
    expect(av).toMatch(/compact=\{compact\}/)
    expect(av).toMatch(/array-buffers/)
  })

  it('lab-fill matrix-scroll is not stuck at early 420 cap', () => {
    expect(css).toMatch(
      /data-lab-fill="1"[^{]*\.matrix-scroll[\s\S]*?max-height:\s*min\(70vh/s,
    )
  })

  it('resize remasures FLIP (geometryGen clear on ResizeObserver)', () => {
    expect(av).toMatch(/geometryGen\.current \+= 1/)
    expect(av).toMatch(/prevCenters\.current\.clear\(\)/)
    expect(av).toMatch(/ResizeObserver/)
  })
})
