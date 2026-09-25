/**
 * V17-02 → V23: the workbench (not a body gutter) owns where data goes.
 * V23 replacement note: V17-02 checked data-data-open / forceSplitForData and a
 * 160px code min-width. V23 replaces them with explicit modes from the container
 * budget and a readable code floor of 340px (stronger than 160px), checked
 * numerically on the pure layout model.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'
import { MIN_CODE_W, resolveCodeWidth, resolveLayoutMode, resolveWideDataWidth } from '../src/components/workbench/layoutModel'

describe('V17-02 / V23 workbench owns data placement', () => {
  const css = readAllCss()
  const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')

  it('no body:has fixed gutter and no padding-right reservation', () => {
    expect(css).not.toMatch(/body:has\(/)
    expect(css).not.toMatch(/padding-right:\s*calc\(min\(360px/)
  })

  it('workbench exposes the resolved mode and data visibility', () => {
    expect(wb).toMatch(/data-layout-mode=\{mode\}/)
    expect(wb).toMatch(/data-data-visible=/)
    expect(wb).toMatch(/resolveLayoutMode\(/)
  })

  it('code keeps a readable width (≥340px) in docked and wide, data open', () => {
    expect(MIN_CODE_W).toBeGreaterThanOrEqual(340)
    for (const w of [900, 1000, 1100, 1300, 1500]) {
      const mode = resolveLayoutMode({ width: w, viewportHeight: 700 })
      expect(mode).not.toBe('tabbed')
      expect(resolveCodeWidth(mode, w, null)).toBeGreaterThanOrEqual(340)
      // even when the user dragged it tiny
      expect(resolveCodeWidth(mode, w, 50)).toBeGreaterThanOrEqual(340)
    }
    for (const w of [1500, 1800, 2400]) {
      const code = resolveCodeWidth('wide', w, null)
      const data = resolveWideDataWidth(w, code, null)
      expect(code).toBeGreaterThanOrEqual(340)
      expect(data).toBeGreaterThanOrEqual(280)
      expect(w - code - data).toBeGreaterThanOrEqual(420)
    }
  })
})
