import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readAllCss } from './helpers/readCss'

const mv = readFileSync(resolve(__dirname, '../src/components/MatrixView.tsx'), 'utf8')
// V23: rules moved into src/styles/scene.css — read all production CSS.
const css = readAllCss()
const intent = readFileSync(resolve(__dirname, '../src/utils/scrollFollowIntent.ts'), 'utf8')

describe('V19-01 matrix follow content coords', () => {
  it('uses content-space scroll (scrollTop + screen delta), not bare offsetTop as scroller coords', () => {
    expect(mv).toMatch(/cellContentBox|scrollTop \+ \(cRect\.top/)
    expect(mv).toMatch(/scrollTo/)
    expect(mv).not.toMatch(/\.scrollIntoView\s*\(/)
    // Must not assign nextTop from cell.offsetTop alone without relating to scroller
    expect(mv).toMatch(/stickyInsets|sticky-top/)
  })

  it('pauses follow on manual matrix scroll and exposes locate/resume controls', () => {
    expect(mv).toMatch(/matrix-locate-btn/)
    expect(mv).toMatch(/matrix-resume-follow-btn/)
    expect(mv).toMatch(/matrix-follow-paused|followPaused/)
    // V20-01: programmaticScroll replaced by createScrollFollowIntent transactions
    expect(mv).toMatch(/createScrollFollowIntent|beginTransaction/)
    expect(intent).toMatch(/beginTransaction/)
    expect(intent).toMatch(/noteUserGesture/)
    expect(mv).toMatch(/followGen/)
  })

  it('only scrolls matrix-scroll owners', () => {
    expect(mv).toMatch(/data-scroll-owner="matrix"/)
    expect(css).toMatch(/matrix-follow-bar/)
  })
})
