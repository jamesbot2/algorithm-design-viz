import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')

describe('V18-01 sheet body not stuck at 96px', () => {
  it('sheet body overrides viz-inspector 96px band', () => {
    expect(css).toMatch(/V18-01/)
    expect(css).toMatch(/\.inspector-sheet-body[\s\S]*?max-height:\s*none/s)
    expect(css).toMatch(/\.inspector-sheet[\s\S]*?display:\s*flex/s)
  })

  it('sheet body is not dual-classed as fixed viz-inspector strip', () => {
    // Must not apply height:96px via className="viz-inspector inspector-sheet-body"
    expect(viz).not.toMatch(/className="viz-inspector inspector-sheet-body"/)
    expect(viz).toMatch(/className="inspector-sheet-body"/)
    expect(viz).toMatch(/data-testid="viz-inspector-sheet"/)
  })

  it('inline strip keeps 96px for non-sheet inspector', () => {
    expect(css).toMatch(/\.viz-inspector\s*\{[\s\S]*?height:\s*96px/s)
  })
})
