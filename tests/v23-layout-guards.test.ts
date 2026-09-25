/**
 * V23 static + model guards for the single layout-state source.
 * These replace the V14–V22 "sheet / lab-fill / height-fallback" CSS guards with
 * structural contracts: no DOM-scanning layout observers, no persistent portals in
 * the scene, no global selectors / z-index or !important escalation, and numeric
 * checks of the pure layout model at the brief's viewports.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'
import {
  resolveLayoutMode,
  resolveCodeWidth,
  resolveDockedDataHeight,
  resolveWideDataWidth,
  MIN_CODE_W,
  MIN_SCENE_W,
  MIN_DATA_W,
} from '../src/components/workbench/layoutModel'

const src = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')
/** Strip comments so documentation mentioning a removed API does not count. */
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('V23 structure guards', () => {
  it('layout does not scan the DOM with MutationObserver / visualViewport guesses', () => {
    for (const f of ['src/components/Layout.tsx', 'src/components/workbench/WorkbenchLayout.tsx']) {
      const c = code(f)
      expect(c, f).not.toMatch(/MutationObserver/)
      expect(c, f).not.toMatch(/visualViewport/)
      expect(c, f).not.toMatch(/window\.innerWidth|window\.innerHeight/)
    }
    expect(code('src/components/workbench/WorkbenchLayout.tsx')).toMatch(/ResizeObserver/)
    expect(code('src/components/Layout.tsx')).toMatch(/ResizeObserver/)
  })

  it('Visualizer renders only the scene: no portal, no transport, no timer', () => {
    const c = code('src/components/Visualizer.tsx')
    expect(c).not.toMatch(/createPortal/)
    expect(c).not.toMatch(/setInterval|setTimeout\(/)
    expect(c).not.toMatch(/PlaybackTransport/)
    expect(c).not.toMatch(/inspector-sheet|viz-inspector/)
  })

  it('exactly one playback owner (usePlaybackController) drives the timer', () => {
    const c = code('src/components/workbench/usePlaybackController.ts')
    expect(c).toMatch(/setInterval|setTimeout/)
    const t = code('src/components/workbench/PlaybackTransport.tsx')
    expect(t).not.toMatch(/setInterval/)
    // Only the temporary settings popover may portal (brief: menus/dialogs allowed)
    expect((t.match(/createPortal\(/g) || []).length).toBeLessThanOrEqual(1)
    if (t.includes('createPortal(')) expect(t).toMatch(/settingsOpen\s*&&\s*createPortal\(/)
  })

  it('CSS: no global * layout selector, no huge z-index, !important only for known cases', () => {
    const css = readAllCss().replace(/\/\*[\s\S]*?\*\//g, '')
    // the only universal rule is box-sizing
    for (const m of css.matchAll(/(?:^|\})\s*\*\s*\{([^}]*)\}/g)) expect(m[1]).not.toMatch(/height|width|overflow|position|display/)
    const z = [...css.matchAll(/z-index\s*:\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...z)).toBeLessThanOrEqual(100)
    const imp = (css.match(/!important/g) || []).length
    // 20 at V23: reduced-motion (6), CodeMirror internals, hidden-attribute enforcement.
    expect(imp).toBeLessThanOrEqual(20)
    // Removed patch layers stay removed
    expect(css).not.toMatch(/data-height-fallback/)
    expect(css).not.toMatch(/\.viz-inspector-sheet\b|\.inspector-sheet\b/)
    expect(css).not.toMatch(/margin-right:\s*var\(--sheet/)
  })

  it('persistent data is a workbench region, never body-portalled', () => {
    const c = code('src/components/data/CurrentStepData.tsx')
    expect(c).not.toMatch(/createPortal|document\.body/)
    expect(code('src/components/workbench/WorkbenchLayout.tsx')).not.toMatch(/createPortal/)
  })
})

describe('V23 layout model numbers (container widths at brief viewports)', () => {
  // Workbench width ≈ viewport − compact rail (~60) − page padding (~24)
  const cases = [
    { vw: 1366, vh: 768, wb: 1282, mode: 'docked' },
    { vw: 1440, vh: 900, wb: 1356, mode: 'docked' },
    { vw: 1920, vh: 1080, wb: 1650, mode: 'wide' },
    { vw: 2560, vh: 1440, wb: 2290, mode: 'wide' },
    { vw: 1024, vh: 600, wb: 940, mode: 'docked' },
    { vw: 900, vh: 500, wb: 816, mode: 'tabbed' }, // low-height fallback (scroll viewport < 460)
    { vw: 390, vh: 844, wb: 366, mode: 'tabbed' },
    { vw: 360, vh: 640, wb: 336, mode: 'tabbed' },
    { vw: 844, vh: 390, wb: 800, mode: 'tabbed' },
  ] as const
  for (const c of cases) {
    it(`${c.vw}x${c.vh} → ${c.mode}; code/scene/data readable`, () => {
      const mode = resolveLayoutMode({ width: c.wb, viewportHeight: c.vh - 50 })
      expect(mode).toBe(c.mode)
      if (mode === 'tabbed') return
      const codeW = resolveCodeWidth(mode, c.wb, null)
      expect(codeW).toBeGreaterThanOrEqual(MIN_CODE_W)
      if (mode === 'wide') {
        const dataW = resolveWideDataWidth(c.wb, codeW, null)
        expect(dataW).toBeGreaterThanOrEqual(MIN_DATA_W)
        expect(c.wb - codeW - dataW).toBeGreaterThanOrEqual(MIN_SCENE_W)
      } else {
        expect(c.wb - codeW).toBeGreaterThanOrEqual(MIN_SCENE_W)
      }
    })
  }

  it('user code width is clamped: never below MIN_CODE_W, never crushes the scene', () => {
    expect(resolveCodeWidth('docked', 1282, 100)).toBe(MIN_CODE_W)
    expect(1282 - resolveCodeWidth('docked', 1282, 5000)).toBeGreaterThanOrEqual(MIN_SCENE_W)
  })

  it('docked data height: content-calibrated, capped by scene share, user pref wins within cap', () => {
    expect(resolveDockedDataHeight({ columnHeight: 600, contentHeight: 150, pref: null, sceneMin: 392 })).toBe(150)
    expect(resolveDockedDataHeight({ columnHeight: 600, contentHeight: 500, pref: null, sceneMin: 392 })).toBe(208)
    expect(resolveDockedDataHeight({ columnHeight: 600, contentHeight: 150, pref: 40, sceneMin: 392 })).toBe(96)
    expect(resolveDockedDataHeight({ columnHeight: 1000, contentHeight: 900, pref: null, sceneMin: 392 })).toBe(450)
  })
})
