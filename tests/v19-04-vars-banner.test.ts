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

  it('when toggle visible, banner allows full button height', () => {
    expect(css).toMatch(/viz-banner-slot:has\(\.inspector-sheet-toggle:not\(\[hidden\]\)\)/)
    expect(css).toMatch(/viz-banner-controls/)
  })
})
