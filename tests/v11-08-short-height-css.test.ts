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
})
