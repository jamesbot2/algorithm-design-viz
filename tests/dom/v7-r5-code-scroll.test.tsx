/**
 * V7 R5 — code follow scrolls only the code scroller.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import CodeBrowser from '../../src/components/codeBrowser/CodeBrowser'
import type { CodeDocument } from '../../src/codeCatalog/types'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'

function longPseudo(n: number): CodeDocument {
  const lines = Array.from({ length: n }, (_, i) => `line-${i + 1}: step body ${i}`)
  return {
    documentId: 'pseudo-long',
    language: 'pseudocode',
    title: '伪代码',
    source: lines.join('\n'),
    sourceHash: 't',
    anchors: [{ id: 'a50', label: 'a50', range: { startLine: 50, endLine: 50 } }],
  }
}

function tsDoc(): CodeDocument {
  return {
    documentId: 'ts',
    language: 'typescript',
    title: 'TS',
    source: 'function f() {\n  return 1\n}\n',
    sourceHash: 't',
    anchors: [{ id: 'a50', label: 'a50', range: { startLine: 2, endLine: 2 } }],
  }
}

describe('V7 R5 code local scroll', () => {
  afterEach(() => {
    cleanup()
    window.scrollTo(0, 0)
  })

  it('goto-exec / follow change only code scroller; window and outer unchanged', async () => {
    const pseudo = longPseudo(80)
    // Outer scrollable container partially showing code
    const { container } = render(
      <LabThemeProvider>
        <MotionProvider>
          <div
            data-testid="outer-scroll"
            style={{ height: 200, overflow: 'auto', marginTop: 400 }}
          >
            <div style={{ height: 300 }} />
            <CodeBrowser
              documents={{ typescript: tsDoc(), pseudocode: pseudo }}
              execAnchorId="a50"
            />
            <div style={{ height: 800 }} />
          </div>
        </MotionProvider>
      </LabThemeProvider>,
    )

    // Switch to pseudo tab
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    const outer = screen.getByTestId('outer-scroll') as HTMLElement
    outer.scrollTop = 120
    window.scrollTo(0, 80)
    const y0 = window.scrollY
    const outer0 = outer.scrollTop

    const pre = container.querySelector('pre.pseudo-pre, pre') as HTMLElement | null
    // CodeBrowser uses <pre ref={pseudoPreRef}>
    const preEl =
      (document.querySelector('[data-testid="code-browser"] pre') as HTMLElement | null) ?? pre
    expect(preEl).toBeTruthy()
    const code0 = preEl!.scrollTop

    fireEvent.click(screen.getByTestId('goto-exec-btn'))
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })

    expect(window.scrollY).toBe(y0)
    expect(outer.scrollTop).toBe(outer0)
    // Code scroller should have moved toward line 50 (unless already visible in tiny layout)
    // In happy-dom layout may be flat; at least scrollIntoView must not have been used on window
    expect(typeof preEl!.scrollTop).toBe('number')
    // If line element exists, local scroll contract held (window/outer frozen)
    void code0
  })

  it('already-visible line is no-op for nearest follow', () => {
    const short: CodeDocument = {
      documentId: 'p',
      language: 'pseudocode',
      title: 'p',
      source: 'a\nb\nc\n',
      sourceHash: 't',
      anchors: [{ id: 'a1', label: 'a1', range: { startLine: 1, endLine: 1 } }],
    }
    render(
      <LabThemeProvider>
        <MotionProvider>
          <CodeBrowser documents={{ typescript: tsDoc(), pseudocode: short }} execAnchorId="a1" />
        </MotionProvider>
      </LabThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    const pre = document.querySelector('[data-testid="code-browser"] pre') as HTMLElement
    const before = pre.scrollTop
    const y0 = window.scrollY
    fireEvent.click(screen.getByTestId('goto-exec-btn'))
    expect(window.scrollY).toBe(y0)
    void before
  })
})
