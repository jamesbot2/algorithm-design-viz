/**
 * V12-01 → V23: the stage owns the graph; nothing overlaps it.
 * V23 replacement note: the fill / scroll `data-height-fallback` pair is gone.
 * The stage is one flex box inside the demo region; graph primary fills it with
 * the SVG at 100% of the plot; when the page is too short the page viewport (.main)
 * scrolls while the workbench keeps --wb-min-h, so the stage never collapses to 0.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const css = readAllCss()

describe('V12-01 / V23 stage owns graph', () => {
  it('stage-viewport is a flex column with overflow auto and min-height 0', () => {
    expect(css).toMatch(/\.stage-viewport\s*\{[^}]*flex:\s*1 1 0;[^}]*min-height:\s*0;[^}]*overflow:\s*auto/s)
  })

  it('graph primary: view + plot flex into the stage, svg is 100% of the plot', () => {
    expect(css).toMatch(/\.stage-viewport\[data-primary-scene="graph"\] > \.graph-view\s*\{[^}]*flex:\s*1 1 0/s)
    expect(css).toMatch(/\.stage-viewport\[data-primary-scene="graph"\] \.graph-plot\s*\{[^}]*flex:\s*1 1 0/s)
    expect(css).toMatch(/\.graph-svg\s*\{[^}]*height:\s*100%/s)
  })

  it('short pages scroll the page viewport; the workbench keeps its min height', () => {
    expect(css).not.toMatch(/data-height-fallback/)
    expect(css).toMatch(/\.workbench-layout\s*\{[^}]*flex:\s*1 1 0;[^}]*min-height:\s*var\(--wb-min-h/s)
    const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')
    expect(wb).toMatch(/'--wb-min-h': `\$\{minH\}px`/)
  })
})
