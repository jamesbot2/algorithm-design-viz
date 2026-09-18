import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V15-03 continuous inspect contract', () => {
  it('drawer has internal transport wired to same goPrev/goNext (source)', () => {
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).toMatch(/inspector-sheet-transport/)
    expect(viz).toMatch(/data-testid="inspector-prev-btn"/)
    expect(viz).toMatch(/data-testid="inspector-next-btn"/)
    expect(viz).toMatch(/data-testid="inspector-step-counter"/)
    // Same controller — buttons call goPrev/goNext, not a second setIdx/player
    expect(viz).toMatch(/onClick=\{goPrev\}/)
    expect(viz).toMatch(/onClick=\{goNext\}/)
    // Only one playing timer ownership path
    expect(viz.match(/useRef<number \| null>\(null\)/g)?.length ?? 0).toBeLessThanOrEqual(2)
  })

  it('sheet is honestly non-modal (aria-modal=false) with side inspect mode', () => {
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).toMatch(/aria-modal="false"/)
    expect(viz).toMatch(/data-inspect-mode="side"/)
    expect(viz).not.toMatch(/aria-modal="true"/)
    const css = readFileSync(resolve('src/styles.css'), 'utf8')
    expect(css).toMatch(/inspector-sheet-transport/)
    expect(css).toMatch(/data-inspect-mode="side"/)
  })

  it('content||entry contract preserved (toggle + sheet)', () => {
    const viz = readFileSync(resolve('src/components/Visualizer.tsx'), 'utf8')
    expect(viz).toMatch(/inspector-sheet-toggle/)
    expect(viz).toMatch(/data-inspector-entry/)
    expect(viz).toMatch(/inspectorLayout/)
  })
})
