import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
const mv = readFileSync(resolve(__dirname, '../src/components/MatrixView.tsx'), 'utf8')
// V23: rules moved into src/styles/scene.css — read all production CSS.
const css = readAllCss()

describe('V18-02 primary scene (LCS DP / merge main)', () => {
  it('declares explicit primaryScene and data-primary-scene', () => {
    expect(viz).toMatch(/primaryScene/)
    expect(viz).toMatch(/data-primary-scene=\{primaryScene\}/)
    expect(viz).toMatch(/return 'matrix'/)
    expect(viz).toMatch(/return 'board'/)
    expect(viz).toMatch(/return 'graph'/)
    expect(viz).toMatch(/return 'array'/)
  })

  it('companionMode compact labels for matrix primary; merge primary-first', () => {
    expect(av).toMatch(/companionMode/)
    expect(av).toMatch(/LABEL_ARRAY_NAMES/)
    expect(av).toMatch(/data-array-order="primary-first"/)
    expect(av).toMatch(/array-labels-strip/)
  })

  it('follows current cell inside matrix-scroll only', () => {
    expect(mv).toMatch(/scrollRefs/)
    expect(mv).toMatch(/scrollTo/)
    expect(mv).toMatch(/matrix-scroll/)
    // Comment may mention scrollIntoView; the call must not exist
    expect(mv).not.toMatch(/\.scrollIntoView\s*\(/)
  })

  it('lab-fill matrix primary stage does not early-cap at 420', () => {
    // V18 used max-height:none; V21-03 caps at 100% of parent (blocks overhang) — still not 420 early-cap
    expect(css).toMatch(/data-primary-scene="matrix"[\s\S]*?\.matrix-scroll[\s\S]*?max-height:\s*100%/s)
    expect(css).not.toMatch(
      /\[data-primary-scene="matrix"\]\s*\.matrix-scroll[\s\S]{0,200}?max-height:\s*420px/,
    )
  })
})
