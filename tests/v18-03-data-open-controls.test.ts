import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')

describe('V18-03 data sheet must not cover edit/run; compact buttons fully visible', () => {
  it('propagates data-data-open onto algo-page', () => {
    expect(wb).toMatch(/closest\('\.algo-page'\)/)
    expect(wb).toMatch(/data-data-open/)
    expect(wb).toMatch(/V18-03/)
  })

  it('reserves sheet on algo-page not only workbench', () => {
    expect(css).toMatch(/\.algo-page\[data-data-open="1"\][\s\S]*?margin-right:\s*min\(360px,\s*38vw\)/s)
    expect(css).toMatch(/algo-page\[data-data-open="1"\][\s\S]*?workbench-layout\[data-data-open="1"\][\s\S]*?margin-right:\s*0/s)
  })

  it('compact idle panel does not clamp with overflow hidden over actions', () => {
    expect(css).toMatch(/V18-03: compact idle controls/)
    // Later V18 override: max-height none + overflow visible for idle panel
    const idx = css.lastIndexOf('algo-page[data-input-editing="0"] .input-panel-v9')
    expect(idx).toBeGreaterThan(0)
    const slice = css.slice(idx, idx + 280)
    expect(slice).toMatch(/max-height:\s*none/)
    expect(slice).toMatch(/overflow:\s*visible/)
  })
})
