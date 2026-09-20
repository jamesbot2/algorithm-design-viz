
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

describe('V21 static guards', () => {
  it('V21-01: pseudo scroll uses content coords relative to pre, not bare offsetTop', () => {
    const src = fs.readFileSync(path.join(root, 'src/components/codeBrowser/CodeBrowser.tsx'), 'utf8')
    const idx = src.indexOf('scrollPseudoToLine')
    expect(idx).toBeGreaterThan(0)
    const scrollFn = src.slice(idx, idx + 2200)
    expect(scrollFn).toMatch(/getBoundingClientRect\(\)/)
    expect(scrollFn).toMatch(/pre\.scrollTop\s*\+\s*\(/)
    expect(scrollFn).not.toMatch(/const elTop = el\.offsetTop/)
    expect(scrollFn).toMatch(/V21-01/)
  })

  it('V21-02: reading pin updates while paused (not first-pause-only)', () => {
    const src = fs.readFileSync(path.join(root, 'src/components/codeBrowser/CodeBrowser.tsx'), 'utf8')
    expect(src).toMatch(/V21-02/)
    expect(src).toMatch(/isAbsorbing\(\)/)
    expect(src).not.toMatch(/if\s*\(\s*!userScrolledAwayRef\.current\s*\)\s*pinTop\s*=/)
  })

  it('V21-03: matrix-scroll no longer forces 120px under lab-fill primary matrix', () => {
    const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8')
    expect(css).toMatch(/V21-03/)
    // Soft floor via min() / 0 — never hard 120px that overruns clip ancestors
    expect(css).toMatch(
      /\[data-primary-scene="matrix"\]\s*\.matrix-scroll[\s\S]{0,280}?min-height:\s*min\(48px,\s*100%\)|\[data-primary-scene="matrix"\]\s*\.matrix-scroll[\s\S]{0,280}?min-height:\s*0/,
    )
    expect(css).not.toMatch(
      /\[data-primary-scene="matrix"\]\s*\.matrix-scroll[\s\S]{0,200}?min-height:\s*120px/,
    )
    expect(css).toMatch(/max-height:\s*100%/)
  })

  it('V21-03: MatrixView uses effectiveScrollport for follow', () => {
    const src = fs.readFileSync(path.join(root, 'src/components/MatrixView.tsx'), 'utf8')
    expect(src).toMatch(/function effectiveScrollport/)
    expect(src).toMatch(/effectiveScrollport\(scroller\)/)
    expect(src).toMatch(/V21-03/)
  })
})

describe('V21-04 acceptance quality', () => {
  const spec = fs.readFileSync(
    path.join(root, 'tests/e2e/v21-pseudo-pin-matrix-acceptance.spec.ts'),
    'utf8',
  )

  it('keeps V20 unassisted (no resume/locate rescue on matrix walk)', () => {
    const matrixBlock = spec.slice(spec.indexOf('V21-03'), spec.indexOf('V21-03b'))
    expect(matrixBlock).not.toMatch(/matrix-resume-follow-btn|matrix-locate-btn/)
    expect(spec).toMatch(/false pause|unassisted|V20 positive/)
  })

  it('covers A/B/C/D + mutation + ×10 with retries 0', () => {
    expect(spec).toMatch(/V21-01a/)
    expect(spec).toMatch(/V21-02/)
    expect(spec).toMatch(/V21-03/)
    expect(spec).toMatch(/mutation/)
    expect(spec).toMatch(/key paths|×10|keypaths/i)
    expect(spec).toMatch(/retries:\s*0/)
  })
})
