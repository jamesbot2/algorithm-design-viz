/**
 * V19-04 → V23 banner geometry.
 * V23 replacement note: V19 asserted the「变量与结果」toggle (inspector-sheet-toggle)
 * sat in the banner controls. V23 removed the sheet: current data is a permanent
 * sibling region, so the banner holds ONE step text + stale badge + legend popover.
 * The glyph-line budget contract is kept (now in styles/layout.css) and strengthened:
 * no inspector-sheet selector may survive anywhere in production CSS or source.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const css = readAllCss()

describe('V19-04 / V23 banner geometry', () => {
  it('separates banner text from controls; no sheet toggle remains', () => {
    expect(viz).toMatch(/viz-banner-text/)
    expect(viz).toMatch(/viz-banner-controls/)
    expect(viz).not.toMatch(/inspector-sheet/)
    expect(viz).not.toMatch(/createPortal/)
  })

  it('banner always budgets ≥1 full glyph line; no :has(toggle) hacks, no sheet CSS', () => {
    expect(css).toMatch(/--banner-line-h/)
    expect(css).toMatch(/--banner-pad-y/)
    expect(css).toMatch(/\.viz-banner-slot\s*\{[^}]*min-height:\s*calc\(var\(--banner-line-h\)/s)
    expect(css).toMatch(/viz-banner-controls/)
    expect(css).not.toMatch(/inspector-sheet/)
    // no line-clamp half-line cut on the step text
    expect(css).not.toMatch(/\.viz-banner-text[^{]*\{[^}]*line-clamp/s)
  })
})
