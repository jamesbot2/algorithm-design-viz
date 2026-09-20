import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('V20-02 banner CSS budget', () => {
  it('does not use fixed 2rem crush without content budget vars', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toMatch(/V20-02: never 32px/)
    expect(css).toMatch(/--banner-line-h/)
    const bad = /\.viz-banner-slot \{\s*height: 2rem;\s*min-height: 2rem;\s*max-height: 2rem;\s*\}/
    expect(css).not.toMatch(bad)
  })
})

describe('V20-03 wrap compartment wired in CodeBrowser', () => {
  it('source uses Compartment reconfigure for lineWrapping', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/components/codeBrowser/CodeBrowser.tsx'),
      'utf8',
    )
    expect(src).toMatch(/new Compartment\(\)/)
    expect(src).toMatch(/wrapCompartment\.current\.reconfigure/)
    expect(src).toMatch(/data-testid="line-wrap-checkbox"/)
    expect(src).not.toMatch(/EditorView\.lineWrapping,\s*\n\s*EditorView\.domEventHandlers/)
  })
})
