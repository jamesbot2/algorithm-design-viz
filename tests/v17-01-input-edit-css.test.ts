import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('V17-01 input edit body budget CSS', () => {
  const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
  const media900 = css.slice(css.indexOf('@media (max-height: 900px)'))

  it('does not apply 4.5rem overflow:hidden to input-panel while editing', () => {
    // Blanket rule that clamps ALL input-panel-v9 must be gone
    expect(media900).not.toMatch(
      /\.input-panel-v9\s*\{\s*max-height:\s*4\.5rem;\s*overflow:\s*hidden/s,
    )
    // Collapsed/idle may compact
    expect(media900).toMatch(
      /data-input-editing="0"[^{]*\.input-panel-v9\s*\{[^}]*max-height:\s*2\.8rem/s,
    )
    // Editing gets real budget
    expect(media900).toMatch(
      /data-input-editing="1"[^{]*\.input-panel-v9[\s\S]*?max-height:\s*none/s,
    )
  })

  it('editing body has min-height / scroll budget under max-height 900', () => {
    expect(media900).toMatch(
      /data-input-editing="1"[^{]*\.input-panel-body[\s\S]*?min-height:\s*4\.5rem/s,
    )
  })
})
