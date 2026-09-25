/**
 * V15-03 → V23 continuous inspect.
 * V23 replacement note: V15-03 required the side sheet to carry its own mini
 * transport (inspector-prev/next) wired to the same goPrev/goNext, and to be
 * non-modal. V23 removes the sheet: the current-data region and the ONE shared
 * transport are visible at the same time (docked/wide) or one tab away with the
 * transport always outside the tab panels (tabbed). The "one controller" rule is
 * now asserted structurally: one timer owner, Visualizer has none, and pages mount
 * exactly one controller + one transport.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (p: string) => readFileSync(resolve(p), 'utf8')

describe('V15-03 / V23 continuous inspect contract', () => {
  it('ONE controller: the timer lives only in usePlaybackController', () => {
    const ctl = read('src/components/workbench/usePlaybackController.ts')
    const viz = read('src/components/Visualizer.tsx')
    expect(ctl.match(/useRef<number \| null>\(null\)/g)?.length ?? 0).toBe(1)
    expect(ctl).toMatch(/window\.setTimeout\(/)
    expect(viz).not.toMatch(/useRef<number \| null>|setTimeout\(|setInterval\(/)
    expect(viz).not.toMatch(/inspector-prev-btn|inspector-next-btn|inspector-sheet-transport/)
  })

  it('each page mounts one controller and one transport', () => {
    for (const p of ['src/pages/AlgoPage.tsx', 'src/pages/teaching/KnapsackUnit.tsx']) {
      const src = read(p)
      expect(src.match(/usePlaybackController\(/g)?.length ?? 0).toBe(1)
      expect(src.match(/<PlaybackTransport /g)?.length ?? 0).toBe(1)
      expect(src.match(/<Visualizer\b/g)?.length ?? 0).toBe(1)
      // Exactly ONE live CurrentStepData. The only other allowed copies are the
      // inert measuring probes passed via `dataProbes=` (rendered by the workbench
      // under DataProbeContext, aria-hidden + inert, no player wiring, never at end).
      const probeAt = src.indexOf('dataProbes={')
      const live = probeAt < 0 ? src : src.slice(0, probeAt) + src.slice(src.indexOf('code={', probeAt))
      expect(live.match(/<CurrentStepData\b/g)?.length ?? 0).toBe(1)
      if (probeAt >= 0) {
        const probe = src.slice(probeAt, src.indexOf('code={', probeAt))
        expect(probe.match(/<CurrentStepData\b/g)?.length ?? 0).toBe(1)
        expect(probe).not.toMatch(/player\.|onStep|seek|atEnd=\{(?!false)/)
      }
    }
  })

  it('data probes are inert, invisible, and never carry test ids', () => {
    const wb = read('src/components/workbench/WorkbenchLayout.tsx')
    expect(wb).toMatch(/className="wb-data-probes"[^>]*aria-hidden="true"[^>]*inert/)
    expect(wb).toMatch(/<DataProbeContext\.Provider value=\{true\}>/)
    for (const p of ['src/components/VarsPanel.tsx', 'src/components/data/CurrentStepData.tsx']) {
      expect(read(p)).not.toMatch(/data-testid=/)
    }
  })

  it('transport is outside every tab panel; data is a region, not a dialog', () => {
    const wb = read('src/components/workbench/WorkbenchLayout.tsx')
    const transportAt = wb.indexOf('data-testid="workbench-transport-slot"')
    const lastPanel = wb.lastIndexOf("role={tabbed ? 'tabpanel' : 'region'}")
    expect(transportAt).toBeGreaterThan(lastPanel)
    expect(wb).toMatch(/aria-label="当前数据"/)
    expect(wb).not.toMatch(/role="dialog"|aria-modal/)
  })
})
