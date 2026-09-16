import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V11-08 short-height dock selectors', () => {
  const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')

  it('hides inline phase via direct-child, not descendant that kills dock', () => {
    expect(css).toMatch(/\.playback-transport\s*>\s*\.phase-jump/)
    expect(css).toMatch(/\.playback-transport\s*>\s*\.phase-track/)
    // Must not use broad descendant that hides settings-panel copies without exception
    // After fix, the media-query hide rule should be direct-child
    const media = css.slice(css.indexOf('@media (max-height: 520px)'))
    expect(media).toMatch(/\.playback-transport\s*>\s*\.phase-jump/)
    expect(media).toMatch(/playback-settings-panel\s+\.phase-jump/)
  })

  it('short-height keeps usable signed bar chart height', () => {
    const media = css.slice(css.indexOf('@media (max-height: 520px)'))
    expect(media).toMatch(/bars-wrap\.signed/)
    expect(media).toMatch(/min-height:\s*180px/)
    expect(media).toMatch(/input-actions-sticky/)
  })

  it('short-height keeps Run visible (no display:none on collapsed sticky actions)', () => {
    const dock = css.slice(css.indexOf('V10-02: short-height'))
    expect(dock).toMatch(/input-actions-sticky/)
    // Must not reclaim the Run row with display:none — preview + after-run need 运行
    expect(dock).not.toMatch(
      /data-input-editing="0"[^{]*input-actions-sticky\s*\{[^}]*display:\s*none/s,
    )
    expect(dock).toMatch(/\[data-testid="cancel-btn"\]:disabled/)
    expect(dock).toMatch(/\[data-testid=run-btn\]|keep Run reachable|NEVER hide Run/)
  })

  it('short landscape raises stage min and collapses page header chrome', () => {
    expect(css).toMatch(/orientation:\s*landscape/)
    const land = css.slice(css.indexOf('/* Short landscape'))
    expect(land).toMatch(/page-header-compact/)
    expect(land).toMatch(/theory-toggle/)
    // Title/back may hide; whole header must not display:none (theory drawer entry)
    expect(land).not.toMatch(
      /page-header-compact\s*\{\s*display:\s*none/s,
    )
    expect(land).toMatch(/min-height:\s*180px/)
    expect(land).toMatch(/bars-wrap\.signed/)
    expect(css).toMatch(/input-actions-sticky/)
  })
})
