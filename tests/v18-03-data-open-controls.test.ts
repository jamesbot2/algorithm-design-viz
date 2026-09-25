/**
 * V18-03 → V23: current data must never cover edit/run or code.
 * V23 replacement note: V18-03 asserted the margin-right compensation that reserved
 * room for the body-fixed data sheet (`.algo-page[data-data-open]` margin-right).
 * V23 removes the fixed sheet and the compensation; the data region is a grid
 * sibling of scene/code, and the toolbar (edit/run) is outside the workbench.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const css = readAllCss()
const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')
const page = readFileSync(resolve(__dirname, '../src/pages/AlgoPage.tsx'), 'utf8')

describe('V18-03 / V23 data never covers controls', () => {
  it('no data-open attribute protocol and no margin-right compensation', () => {
    expect(wb).not.toMatch(/data-data-open|closest\('\.algo-page'\)|MutationObserver/)
    expect(css).not.toMatch(/data-data-open/)
    expect(css).not.toMatch(/margin-right:\s*min\(360px/)
  })

  it('data region is placed by the grid (gridArea), never position:fixed', () => {
    expect(wb).toMatch(/gridArea: tabbed \? 'view' : 'data'/)
    expect(css).not.toMatch(/\.wb-data[^{]*\{[^}]*position:\s*fixed/s)
  })

  it('toolbar with edit + run is rendered outside the workbench, not clamped', () => {
    const toolbar = page.indexOf('input-summary-bar')
    const workbench = page.indexOf('<WorkbenchLayout')
    expect(toolbar).toBeGreaterThan(0)
    expect(toolbar).toBeLessThan(workbench)
    expect(page.slice(toolbar, workbench)).toMatch(/data-testid="run-btn"/)
    expect(page.slice(toolbar, workbench)).toMatch(/data-testid="input-edit-toggle"/)
    expect(css).not.toMatch(/\.algo-toolbar[^{]*\{[^}]*max-height:\s*\d/s)
  })
})
