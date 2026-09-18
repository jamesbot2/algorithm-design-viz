import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

describe('V14-01 inspector layout unification', () => {
  it('tracks inspectorLayout and measures inline visibility', () => {
    expect(viz).toMatch(/inspectorLayout/)
    expect(viz).toMatch(/inlineInspectorRef/)
    expect(viz).toMatch(/getComputedStyle/)
    expect(viz).toMatch(/data-inspector-layout/)
  })

  it('exposes named alternate entry whenever drawer layout', () => {
    expect(viz).toMatch(/inspector-sheet-toggle/)
    expect(viz).toMatch(/aria-label="变量与结果"/)
    expect(viz).toMatch(/hidden=\{inspectorLayout !== 'drawer'\}/)
  })

  it('does not remount two VarsPanels at once', () => {
    // When drawer open, inline VarsPanel is gated off
    expect(viz).toMatch(/inspectorLayout === 'drawer' && inspectorSheetOpen/)
  })

  it('CSS keeps toggle reachable for lab-fill + graph (desktop)', () => {
    expect(css).toMatch(/inspector-sheet-toggle:not\(\[hidden\]\)/)
    expect(css).toMatch(/visualizer:has\(\.graph-view\) \.inspector-sheet-toggle/)
  })
})
