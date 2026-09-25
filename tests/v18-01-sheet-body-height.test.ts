/**
 * V18-01 → V23: current data is never stuck in a 96px band.
 * V23 replacement note: V18-01 guarded the portal sheet body against the inline
 * 96px `.viz-inspector` band. V23 deletes both the band and the sheet; the data
 * lives in ONE region whose body is the only data scroller and whose height comes
 * from the workbench grid (content-calibrated + user split), not a fixed px value.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const css = readAllCss()
const viz = readFileSync(resolve(__dirname, '../src/components/Visualizer.tsx'), 'utf8')
const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')

describe('V18-01 / V23 data region height', () => {
  it('no fixed 96px inspect band and no viz-inspector anywhere', () => {
    expect(css).not.toMatch(/\.viz-inspector/)
    expect(css).not.toMatch(/height:\s*96px/)
    expect(viz).not.toMatch(/viz-inspector|VarsPanel|inspector-sheet/)
  })

  it('data body is the single data scroller and fills its grid track', () => {
    expect(css).toMatch(/\.wb-data-body\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*auto/s)
    expect(wb).toMatch(/data-scroll-owner="data"/)
    expect((wb.match(/data-scroll-owner="data"/g) ?? []).length).toBe(1)
  })

  it('data track height is content-calibrated (resolveDockedDataHeight), not a constant', () => {
    expect(wb).toMatch(/resolveDockedDataHeight\(/)
    expect(wb).toMatch(/contentHeight:\s*dataContentH/)
  })
})
