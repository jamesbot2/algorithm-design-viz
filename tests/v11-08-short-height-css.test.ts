/**
 * V11-08 → V23 short-height transport + controls.
 * V23 replacement note: V11-08 checked a `@media (max-height:520px)` ladder and a
 * short-landscape page-header collapse. V23 decides from the measured workbench
 * budget instead of viewport media: inline phase chips show only when the
 * workbench is roomy (data-transport="roomy"), the full phase list is always in the
 * settings popover, Run/Cancel/theory stay in the one-row toolbar, and low-height
 * tabs give the scene the whole scroll viewport.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const css = readAllCss()
const wb = readFileSync(resolve(__dirname, '../src/components/workbench/WorkbenchLayout.tsx'), 'utf8')
const tr = readFileSync(resolve(__dirname, '../src/components/workbench/PlaybackTransport.tsx'), 'utf8')

describe('V11-08 / V23 short-height transport', () => {
  it('hides only the inline phase chips (direct child) when not roomy; dock copy never hidden', () => {
    expect(css).toMatch(/\.workbench-layout:not\(\[data-transport="roomy"\]\) \.playback-transport > \.phase-jump\s*\{[^}]*display:\s*none/s)
    expect(css).not.toMatch(/playback-settings-panel[^{]*\.phase-jump[^{]*\{[^}]*display:\s*none/s)
    expect(wb).toMatch(/data-transport=\{!tabbed && box\.h >= 700 \? 'roomy' : 'compact'\}/)
    expect(tr).toMatch(/data-testid="phase-jump-dock"/)
  })

  it('settings entry is always rendered in the transport meta group', () => {
    expect(tr).toMatch(/transport-meta[\s\S]*data-testid="playback-settings-toggle"/)
    expect(css).not.toMatch(/playback-settings-dock[^{]*\{[^}]*display:\s*none/s)
  })

  it('Run / Cancel / theory are never display:none', () => {
    expect(css).not.toMatch(/(run-btn|cancel-btn|input-actions|theory-toggle)[^{]*\{[^}]*display:\s*none/s)
  })

  it('short landscape tabs: one transport row and scene claims the scroll viewport', () => {
    expect(css).toMatch(/@media \(min-width: 600px\)\s*\{\s*\.workbench-layout\[data-layout-mode="tabbed"\] \.playback-transport\s*\{[^}]*grid-template-areas:\s*"ctrl scrub meta"/s)
    expect(wb).toMatch(/Math\.max\(300, viewportHeight - 8\)/)
  })
})
