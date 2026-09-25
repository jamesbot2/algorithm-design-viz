import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

describe('V17-03 array/DP stage budget', () => {
  const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
  const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

  it('main array maxBudget is not hard-coded desktop 160', () => {
    // Old: const maxBudget = ... : 160
    expect(av).not.toMatch(
      /const maxBudget = landscape && ultra \? 240 : landscape && short \? 220 : short \? 180 : 160/,
    )
    // V24-01A migration: the budget is no longer derived from the whole stage /
    // viewport ("stageBudget", window.innerHeight*0.5) — that produced giant bars
    // clipped inside a ~50px card. It now comes from the box the ArrayView is actually
    // allotted, with chrome measured from the DOM (stronger than the old text check).
    const fit = av.slice(av.indexOf('V24-01A: bar geometry'), av.indexOf('const geometryGen'))
    expect(fit.length).toBeGreaterThan(100)
    expect(fit).toMatch(/self\.getBoundingClientRect\(\)\.height/)
    expect(fit).not.toMatch(/window\.innerHeight/)
    expect(fit).not.toMatch(/closest\('\[data-testid="viz-canvas"\]'\)/)
  })

  it('aux buffers stay compact (BUFFER_ARRAY_NAMES + compact=true)', () => {
    expect(av).toMatch(/BUFFER_ARRAY_NAMES/)
    expect(av).toMatch(/compact=\{compact\}/)
    expect(av).toMatch(/array-buffers/)
  })

  // V23 replacement: the lab-fill min(70vh) rule is gone with the lab-fill layer; the
  // primary matrix scroller is bounded by the stage (max-height:100%, flex:1) and the
  // scene rule out-specifies the base 420px cap (which only applies outside a stage).
  it('primary matrix-scroll is not stuck at early 420 cap (stage-bounded instead)', () => {
    const all = readAllCss()
    expect(all).toMatch(
      /\.stage-viewport\[data-primary-scene="matrix"\] \.matrix-scroll,[\s\S]*?\{[^}]*flex:\s*1 1 auto;[^}]*max-height:\s*100%/s,
    )
    // data-lab-fill only sizes the shell (main-wrap / topbar / main), never scene internals
    expect(all).not.toMatch(/data-lab-fill="1"\][^{,]*(stage-viewport|matrix|graph|viz-|workbench)/)
    expect(all).not.toMatch(/--wb-measured-h/)
  })

  it('resize remasures FLIP (geometryGen clear on ResizeObserver)', () => {
    expect(av).toMatch(/geometryGen\.current \+= 1/)
    expect(av).toMatch(/prevCenters\.current\.clear\(\)/)
    expect(av).toMatch(/ResizeObserver/)
  })
})
