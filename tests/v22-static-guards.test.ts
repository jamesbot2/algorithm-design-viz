import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { readAllCss } from './helpers/readCss'

const root = process.cwd()

describe('V22 static guards', () => {
  // V23: the strip / follow-bar rules live in src/styles/scene.css — read all production CSS.
  const css = readAllCss(root)

  it('V22-01: array-labels-strip does not flex-shrink below glyph line', () => {
    expect(css).toMatch(/V22-01/)
    // Prefer flex-shrink:0 (0 0 auto) over min-height:0 shrink
    expect(css).toMatch(
      /array-labels-strip[\s\S]{0,220}?flex:\s*0\s+0\s+auto/,
    )
    expect(css).not.toMatch(
      /array-labels-strip[\s\S]{0,180}?flex:\s*0\s+1\s+auto[\s\S]{0,80}?min-height:\s*0/,
    )
  })

  it('V22-02: matrix-follow-bar keeps intrinsic height without max-height clip', () => {
    expect(css).toMatch(/V22-02/)
    expect(css).toMatch(/matrix-follow-bar[\s\S]{0,200}?flex:\s*0\s+0\s+auto/)
    // Lab-fill must not clip buttons with max-height + overflow:hidden
    const labFillBar = css.slice(
      css.indexOf('V22-02: compact buttons'),
      css.indexOf('V22-02: compact buttons') + 500,
    )
    expect(labFillBar).toMatch(/overflow:\s*visible/)
    expect(labFillBar).toMatch(/max-height:\s*none/)
    expect(css).not.toMatch(
      /matrix-follow-bar[\s\S]{0,120}?max-height:\s*1\.7rem[\s\S]{0,80}?overflow:\s*hidden/,
    )
  })

  it('V22: short-height media does not crush strip to 1.6rem or bar to 1.35rem', () => {
    expect(css).toMatch(/V22:\s*short height/)
    expect(css).not.toMatch(
      /max-height:\s*640px\)[\s\S]{0,400}?array-labels-strip[\s\S]{0,120}?max-height:\s*1\.6rem/,
    )
    expect(css).not.toMatch(
      /max-height:\s*640px\)[\s\S]{0,500}?matrix-follow-bar[\s\S]{0,80}?max-height:\s*1\.35rem/,
    )
  })

  it('preserves V21 matrix soft floor (no hard 120px restore)', () => {
    expect(css).toMatch(/min-height:\s*min\(48px,\s*100%\)/)
    expect(css).not.toMatch(
      /\[data-primary-scene="matrix"\]\s*\.matrix-scroll[\s\S]{0,200}?min-height:\s*120px/,
    )
  })
})

describe('V22 acceptance quality', () => {
  const spec = fs.readFileSync(
    path.join(root, 'tests/e2e/v22-joint-matrix-input-controls.spec.ts'),
    'utf8',
  )
  const v19 = fs.readFileSync(
    path.join(root, 'tests/e2e/v19-matrix-cm-compact-acceptance.spec.ts'),
    'utf8',
  )

  it('joint asserts + mutations + unassisted; retries 0', () => {
    expect(spec).toMatch(/measureJoint/)
    expect(spec).toMatch(/assertJointReadable/)
    expect(spec).toMatch(/unassisted/)
    expect(spec).toMatch(/mutation/)
    expect(spec).toMatch(/maxHeight = '10px'|maxHeight = "10px"/)
    expect(spec).toMatch(/maxHeight = '6px'|maxHeight = "6px"/)
    expect(spec).toMatch(/retries:\s*0/)
    const unassisted = spec.slice(spec.indexOf('V22-03b'), spec.indexOf('V22-03c'))
    expect(unassisted).toMatch(/Do NOT click resume\/locate|do NOT click resume\/locate/i)
    expect(unassisted).not.toMatch(/matrix-resume-follow-btn/)
    expect(unassisted).not.toMatch(/getByTestId\('matrix-locate-btn'\)\.click/)
  })

  it('V19 measureCompact no longer uses ≥8px false positive alone', () => {
    expect(v19).toMatch(/V22-03/)
    expect(v19).not.toMatch(/readable:\s*chars\.filter\(\(el\)\s*=>\s*vis\(el\)\s*>=\s*8\)/)
    expect(v19).toMatch(/h \* 0\.9|elH \* 0\.9/)
  })
})
