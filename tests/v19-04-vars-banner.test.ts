import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

describe('V19-04 vars button banner geometry', () => {
  it('separates banner text from controls', () => {
    expect(viz).toMatch(/viz-banner-controls/)
    expect(viz).toMatch(/inspector-sheet-toggle/)
  })

  it('banner always budgets ≥1 full glyph line (V20 supersedes :has(toggle)-only raise)', () => {
    // V20-02: unified --banner-line-h / --banner-pad-y; no longer only when toggle visible
    expect(css).toMatch(/--banner-line-h/)
    expect(css).toMatch(/--banner-pad-y/)
    expect(css).toMatch(/viz-banner-controls/)
    expect(css).toMatch(/inspector-sheet-toggle/)
    expect(css).not.toMatch(/viz-banner-slot:has\(\.inspector-sheet-toggle:not\(\[hidden\]\)\)/)
  })
})
