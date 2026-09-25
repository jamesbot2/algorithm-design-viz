/**
 * V15-01 keyboard — source contracts (V23 update).
 * V23 replacement note: the Space/←/→ handler moved with the controller from
 * Visualizer into usePlaybackController (Visualizer has NO key handler now). The
 * sheet Escape contract is replaced by the real theory modal: Escape closes it and
 * restores focus to the toggle without touching seek/run.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V15-01 keyboard — source contracts', () => {
  it('controller uses shared keyboardGuard; Visualizer has no second key handler', () => {
    const ctl = readFileSync(resolve('src/components/workbench/usePlaybackController.ts'), 'utf8')
    expect(ctl).toMatch(/shouldIgnoreKeyboard/)
    expect(ctl).toMatch(/keyboardGuard/)
    expect(ctl.match(/addEventListener\('keydown'/g)?.length ?? 0).toBe(1)
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).not.toMatch(/keydown|onKeyDown/)
  })

  it('keyboardGuard checks editing controls, composedPath, defaultPrevented, isComposing, modifiers', () => {
    const src = readFileSync(resolve('src/utils/keyboardGuard.ts'), 'utf8')
    expect(src).toMatch(/eventTargetsEditingControl/)
    expect(src).toMatch(/composedPath/)
    expect(src).toMatch(/defaultPrevented/)
    expect(src).toMatch(/isComposing/)
    expect(src).toMatch(/altKey|ctrlKey|metaKey/)
    expect(src).toMatch(/INPUT|TEXTAREA|SELECT/)
    expect(src).toMatch(/isContentEditable/)
  })

  it('Esc closes the theory modal and restores focus without seek/run mutation hooks', () => {
    const page = readFileSync(resolve('src/pages/AlgoPage.tsx'), 'utf8')
    expect(page).toMatch(/closeTheory/)
    expect(page).toMatch(/theoryToggleRef/)
    expect(page).toMatch(/Escape/)
    const block = page.slice(page.indexOf('const closeTheory'), page.indexOf('}, [theoryOpen, closeTheory])'))
    expect(block).toMatch(/theoryToggleRef\.current\?\.focus\(\)/)
    expect(block).toMatch(/e\.key === 'Escape'/)
    expect(block).not.toMatch(/goPrev|goNext|setIdx|seekTo|onRun|setSeekCommand/)
  })

  it('GraphResultPanel target input is identifiable for focus tests', () => {
    const grp = readFileSync(resolve('src/components/graph/GraphResultPanel.tsx'), 'utf8')
    expect(grp).toMatch(/data-testid="graph-result-target"/)
  })
})
