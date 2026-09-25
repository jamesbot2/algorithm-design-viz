/**
 * V14-01 → V23 current-data layout unification.
 * V23 replacement note: V14-01 checked Visualizer's inline/drawer inspector state
 * machine (inspectorLayout, getComputedStyle probing, a sheet toggle kept visible
 * by CSS :has()). V23 deletes that machine: Visualizer renders only step text +
 * scene; CurrentStepData is rendered ONCE by the page into the workbench data
 * region, whose visibility is page-owned prefs (data-toggle with aria-expanded).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')
const csd = readFileSync(resolve(__dirname, '../src/components/data/CurrentStepData.tsx'), 'utf8')
const css = readAllCss()

describe('V14-01 / V23 current-data layout unification', () => {
  it('Visualizer has no inspector state machine, no DOM style probing, no portal', () => {
    expect(viz).not.toMatch(/inspectorLayout|inlineInspectorRef|getComputedStyle|data-inspector-layout/)
    expect(viz).not.toMatch(/createPortal|document\.body/)
  })

  it('data visibility is page-owned and has an accessible named toggle', () => {
    expect(wb).toMatch(/data-testid="data-toggle"/)
    expect(wb).toMatch(/aria-expanded=\{prefs\.dataVisible\}/)
    expect(wb).toMatch(/aria-controls="wb-data-body"/)
    expect(wb).toMatch(/onPrefsChange\(\{ dataVisible: !prefs\.dataVisible \}\)/)
  })

  it('exactly one VarsPanel owner (CurrentStepData), rendered once', () => {
    expect(csd.match(/<VarsPanel\b/g)?.length ?? 0).toBe(1)
    expect(viz).not.toMatch(/VarsPanel/)
    expect(wb.match(/\{data\}/g)?.length ?? 0).toBe(1)
  })

  it('no CSS :has() visibility hacks for a sheet toggle', () => {
    expect(css).not.toMatch(/inspector-sheet-toggle/)
    expect(css).not.toMatch(/visualizer:has\(/)
  })
})
