import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V15-01 keyboard — source contracts', () => {
  it('Visualizer uses shared keyboardGuard (no early sheet bypass before inputs)', () => {
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).toMatch(/shouldIgnoreKeyboard/)
    expect(viz).toMatch(/keyboardGuard/)
    // Must NOT contain the V14 early-return that preferred sheet scrubbing before INPUT checks
    expect(viz).not.toMatch(
      /\(e\.key === 'ArrowLeft' \|\| e\.key === 'ArrowRight'\) &&\s*\n\s*t\.closest\('\.inspector-sheet/,
    )
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

  it('Esc closes sheet and restores focus without seek/run mutation hooks', () => {
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).toMatch(/closeInspectorSheet/)
    expect(viz).toMatch(/inspectorToggleRef/)
    expect(viz).toMatch(/Escape/)
    // close path must not call goPrev/goNext/setIdx
    const closeBlock = viz.slice(
      viz.indexOf('const closeInspectorSheet'),
      viz.indexOf('useEffect(() => {\n    const onKey'),
    )
    expect(closeBlock).not.toMatch(/goPrev|goNext|setIdx/)
  })

  it('GraphResultPanel target input is identifiable for focus tests', () => {
    const grp = readFileSync(resolve('src/components/graph/GraphResultPanel.tsx'), 'utf8')
    expect(grp).toMatch(/data-testid="graph-result-target"/)
  })
})
