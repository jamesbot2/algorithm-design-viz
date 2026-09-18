import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
const graphView = readFileSync(resolve(__dirname, '../src/components/GraphView.tsx'), 'utf8')

describe('V13-01 graph warn vs plot + readability', () => {
  it('graph-view is column; graph-plot is flex:1 min-height:0', () => {
    expect(css).toMatch(/\.graph-view\s*\{[^}]*flex-direction:\s*column/s)
    expect(css).toMatch(/\.graph-plot\s*\{[^}]*flex:\s*1\s+1\s+auto/s)
    expect(css).toMatch(/\.graph-plot\s*\{[^}]*min-height:\s*0/s)
  })

  it('neg warning is flex:0 auto sibling (not eating SVG height:100%)', () => {
    expect(css).toMatch(/\.graph-view\s*>\s*\.graph-neg-warning\s*\{[^}]*flex:\s*0\s+0\s+auto/s)
  })

  it('node-label size comes from GraphView camera (~12–14 CSS px policy)', () => {
    expect(graphView).toMatch(/MIN_LABEL_CSS_PX\s*=\s*12/)
    expect(graphView).toMatch(/BASE_LABEL_USER\s*=\s*1[234]/)
    // CSS must NOT hard-lock font-size (would defeat user-unit camera scaling)
    expect(css).not.toMatch(/\.node-label\s*\{[^}]*font-size:/s)
  })

  it('GraphView measures plot viewport and keeps camera when structure unchanged', () => {
    expect(graphView).toMatch(/graph-plot/)
    expect(graphView).toMatch(/ResizeObserver/)
    expect(graphView).toMatch(/structureChanged|structRef/)
    expect(graphView).toMatch(/MIN_LABEL_CSS_PX/)
    expect(graphView).toMatch(/labelUser/)
  })
})
