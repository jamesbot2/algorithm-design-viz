import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../src/styles.css'), 'utf8')
const cb = readFileSync(resolve(__dirname, '../src/components/codeBrowser/CodeBrowser.tsx'), 'utf8')

describe('V19-02 CodeMirror real scrollport', () => {
  it('constrains cm-editor/theme and makes cm-scroller the scrollport', () => {
    expect(css).toMatch(/\.code-browser-cm-wrap \.cm-scroller[\s\S]*?overflow:\s*auto\s*!important/s)
    expect(css).toMatch(/\.code-browser-cm-wrap \.cm-editor[\s\S]*?max-height:\s*100%\s*!important/s)
    expect(css).toMatch(/cm-theme-dark/)
  })

  it('scrolls after layout; pauses follow only on real scrollDOM scroll', () => {
    expect(cb).toMatch(/scheduleScrollAfterLayout/)
    expect(cb).toMatch(/requestMeasure/)
    expect(cb).toMatch(/scrollDOM\.addEventListener\('scroll'/)
    // wrap must not pause follow on wheel alone
    expect(cb).not.toMatch(/code-browser-cm-wrap[\s\S]{0,200}onWheel/s)
  })

  it('toolbar/meta are flex natural height; wrap fills remainder', () => {
    expect(css).toMatch(/\.code-browser-toolbar[\s\S]*?flex:\s*0\s+0\s+auto/s)
    expect(css).toMatch(/\.code-browser-cm-wrap[\s\S]*?flex:\s*1\s+1\s+auto/s)
  })
})
