/**
 * V27: the code browser's pseudocode tab locates every LCS event on its own statement,
 * and a document with no location for the current step says so honestly.
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import CodeBrowser from '../../src/components/codeBrowser/CodeBrowser'
import { getCatalog } from '../../src/codeCatalog'
import { getAlgo } from '../../src/algorithms/registry'
import type { Step } from '../../src/types/step'
import { pickPrimaryCodeRef, weakContextRefs } from '../../src/utils/codeRefs'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'
import { classifyLcsMessage, lcsExecFailures } from '../helpers/lcsCodeSemantics'

type P = Parameters<typeof CodeBrowser>[0]
const wrap = (props: P) => (
  <LabThemeProvider>
    <MotionProvider>
      <CodeBrowser {...props} />
    </MotionProvider>
  </LabThemeProvider>
)

function stepProps(s: Step): Partial<P> {
  return {
    execAnchorId: pickPrimaryCodeRef(s)?.anchorId,
    contextAnchorIds: weakContextRefs(s).map((r) => r.anchorId),
  }
}

function header() {
  const t = document.querySelector('.code-browser-meta')?.textContent ?? ''
  const m = t.match(/▶ (\S+) @(\S+):(\S+)/)
  return m ? { anchor: m[1]!, docId: m[2]!, line: m[3]! } : null
}

function shownPseudo() {
  const pre = screen.getByTestId('pseudo-pre')
  const attr = pre.getAttribute('data-exec-line') ?? ''
  const active = pre.querySelector('.code-line.active .lt')
  return {
    pre,
    execLine: attr === '' ? null : Number(attr),
    domText: active ? active.textContent : null,
    weakLines: [...pre.querySelectorAll('.code-line.context')].map((e) => Number(e.getAttribute('data-line'))),
    activeCount: pre.querySelectorAll('.code-line.active').length,
  }
}

describe('V27 LCS pseudocode in the code browser', () => {
  afterEach(() => cleanup())
  const lcs = getCatalog('lcs')!
  const steps = getAlgo('lcs')!.solve!({} as never).trace.steps as Step[]

  it('walking frames 1..95 on the pseudo tab: every frame has a valid, semantically right exec line (same <pre>, no remount)', () => {
    const { rerender } = render(wrap({ documents: lcs, ...stepProps(steps[0]!) }))
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    const pre0 = screen.getByTestId('pseudo-pre')
    const fails: string[] = []
    steps.forEach((s, k) => {
      rerender(wrap({ documents: lcs, ...stepProps(s) }))
      const sh = shownPseudo()
      expect(sh.pre).toBe(pre0)
      const h = header()
      const f = lcsExecFailures(lcs.pseudocode!, classifyLcsMessage(s.message ?? ''), {
        execLine: sh.execLine,
        headerDocId: h?.docId ?? null,
        headerLine: h?.line ?? null,
        domText: sh.domText,
        weakLines: sh.weakLines,
      })
      if (sh.activeCount !== 1) f.push(`${sh.activeCount} active lines`)
      if ((screen.getByTestId('goto-exec-btn') as HTMLButtonElement).disabled) f.push('回到执行行 disabled')
      if (screen.queryByTestId('code-doc-no-location')) f.push('no-location notice shown')
      for (const x of f) fails.push(`frame ${k + 1}/95 "${s.message}": ${x}`)
    })
    expect(fails).toEqual([])
  })

  it('frame 3 round trip TS → pseudo → TS keeps each document on its own statement', () => {
    const s = steps[2]!
    render(wrap({ documents: lcs, ...stepProps(s) }))
    const tsLine = () => Number(screen.getByTestId('code-mirror-wrap').getAttribute('data-exec-line'))
    const t1 = tsLine()
    expect(lcsExecFailures(lcs.typescript, 'elseWrite', { execLine: t1 })).toEqual([])
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    const p = shownPseudo()
    expect(lcsExecFailures(lcs.pseudocode!, 'elseWrite', { execLine: p.execLine, domText: p.domText, weakLines: p.weakLines })).toEqual([])
    expect(header()?.docId).toBe('lcs.pseudo')
    fireEvent.click(screen.getByTestId('tab-ts'))
    expect(tsLine()).toBe(t1)
    expect(header()?.docId).toBe('lcs.ts')
  })
})

describe('V27 honest state when the shown document has no location for the step', () => {
  afterEach(() => cleanup())
  const bubble = getCatalog('bubbleSort')!

  it('pseudo doc without the anchor: explicit notice, no active line, goto disabled, entry to the full implementation', async () => {
    // bubbleSort's pseudocode has no `done` anchor (out of V27 scope; used as a real unsupported case)
    expect(bubble.pseudocode!.anchors.some((a) => a.id === 'done')).toBe(false)
    render(wrap({ documents: bubble, execAnchorId: 'done' }))
    expect(screen.queryByTestId('code-doc-no-location')).toBeNull()
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    const notice = screen.getByTestId('code-doc-no-location')
    expect(notice.getAttribute('role')).toBe('status')
    expect(notice.textContent).toMatch(/当前文档.*没有.*执行位置/)
    expect(screen.getByTestId('pseudo-pre').getAttribute('data-exec-line')).toBe('')
    expect(screen.getByTestId('pseudo-pre').querySelectorAll('.code-line.active').length).toBe(0)
    expect((screen.getByTestId('goto-exec-btn') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('code-browser').getAttribute('data-exec-state')).toBe('no-location')
    await act(async () => {
      fireEvent.click(screen.getByTestId('code-doc-open-ts'))
    })
    expect(screen.getByTestId('code-browser').getAttribute('data-tab')).toBe('ts')
    expect(screen.getByTestId('code-mirror-wrap').getAttribute('data-exec-line')).not.toBe('')
    expect(screen.queryByTestId('code-doc-no-location')).toBeNull()
    expect(screen.getByTestId('code-browser').getAttribute('data-exec-state')).toBe('mapped')
  })

  it('initial preview (no step yet) is not a missing location', () => {
    render(wrap({ documents: getCatalog('lcs')!, execAnchorId: undefined }))
    fireEvent.click(screen.getByTestId('tab-pseudo'))
    expect(screen.queryByTestId('code-doc-no-location')).toBeNull()
    expect(screen.getByTestId('code-browser').getAttribute('data-exec-state')).toBe('preview')
    expect(screen.getByTestId('pseudo-pre').getAttribute('data-exec-line')).toBe('')
  })

  it('an unmapped teaching event keeps the existing 未映射 banner (no second notice)', () => {
    render(wrap({ documents: getCatalog('lcs')!, execAnchorId: 'dpFill', unmapped: true }))
    expect(screen.getByTestId('code-unmapped')).toBeTruthy()
    expect(screen.queryByTestId('code-doc-no-location')).toBeNull()
    expect(screen.getByTestId('code-browser').getAttribute('data-exec-state')).toBe('unmapped')
  })
})
