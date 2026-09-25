import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const av = readFileSync(resolve(__dirname, '../src/components/ArrayView.tsx'), 'utf8')
// V23: rules moved into src/styles/scene.css — read all production CSS.
const css = readAllCss()

describe('V19-03 compact semantic labels', () => {
  it('renders CompactSequenceStrip instead of clipped full ArrayView in companion mode', () => {
    expect(av).toMatch(/CompactSequenceStrip/)
    expect(av).toMatch(/data-compact-semantic/)
    expect(av).toMatch(/compact-ch/)
    expect(av).toMatch(/companionMode[\s\S]*CompactSequenceStrip/s)
  })

  it('strip CSS no longer max-height:40px overflow:hidden for matrix primary', () => {
    // The matrix primary strip rule must not clip with 40px hidden
    const block = css.match(
      /data-primary-scene="matrix"[\s\S]*?array-labels-strip[\s\S]{0,400}/,
    )
    expect(block?.[0] ?? '').not.toMatch(/max-height:\s*40px/)
    expect(css).toMatch(/compact-seq-row/)
    expect(css).toMatch(/compact-ch/)
  })

  it('keeps merge/insert buffer identity path (BUFFER_ARRAY_NAMES + primary-first)', () => {
    expect(av).toMatch(/BUFFER_ARRAY_NAMES/)
    expect(av).toMatch(/data-array-order="primary-first"/)
  })
})
