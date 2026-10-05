/**
 * V28: language switching in the code browser — one persistent CodeMirror (no remount), lazy
 * language load with a skeleton, every LCS/KMP/Floyd frame located in every language through
 * the rendered DOM, copy = current language, persisted preference, honest fallback.
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CodeBrowser from '../../src/components/codeBrowser/CodeBrowser'
import { getCatalog } from '../../src/codeCatalog'
import { getAlgo } from '../../src/algorithms/registry'
import type { Step } from '../../src/types/step'
import type { CodeDocument } from '../../src/codeCatalog/types'
import { pickPrimaryCodeRef, weakContextRefs } from '../../src/utils/codeRefs'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'
import { CODE_LANGUAGE_STORAGE_KEY, __reloadCodeLanguageForTests } from '../../src/codeCatalog/languagePreference'
import { __resetLanguageCacheForTests, loadAlgoLanguages, peekLanguageDoc } from '../../src/codeCatalog/languages'
import { execFailures, SEMANTICS, type Phase2Algo } from '../helpers/multiLangSemantics'

type P = Parameters<typeof CodeBrowser>[0]
const wrap = (props: P) => (
  <LabThemeProvider>
    <MotionProvider>
      <CodeBrowser {...props} />
    </MotionProvider>
  </LabThemeProvider>
)
const stepProps = (s: Step): Partial<P> => ({
  execAnchorId: pickPrimaryCodeRef(s)?.anchorId,
  contextAnchorIds: weakContextRefs(s).map((r) => r.anchorId),
})
const LANGS = ['python', 'cpp', 'java', 'rust', 'go'] as const
const root = () => screen.getByTestId('code-browser')
const cmWrap = () => screen.getByTestId('code-mirror-wrap')
const header = () => {
  const m = (document.querySelector('.code-browser-meta')?.textContent ?? '').match(/▶ (\S+) @(\S+):(\S+)/)
  return m ? { anchor: m[1]!, docId: m[2]!, line: m[3]! } : null
}
const lines = (d: CodeDocument) => d.source.split('\n')

async function pick(lang: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(lang === 'typescript' ? 'tab-ts' : `tab-lang-${lang}`))
  })
  await waitFor(() => expect(root().getAttribute('data-code-loading')).toBe('0'))
}

beforeEach(() => {
  localStorage.clear()
  __reloadCodeLanguageForTests()
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  __reloadCodeLanguageForTests()
})

describe('V28 code browser language switching', () => {
  const traces: Record<Phase2Algo, Step[]> = {
    lcs: getAlgo('lcs')!.solve!({} as never).trace.steps as Step[],
    kmp: getAlgo('kmp')!.solve!({} as never).trace.steps as Step[],
    floyd: getAlgo('floyd')!.solve!({} as never).trace.steps as Step[],
  }

  it('first switch shows the loading skeleton (goto disabled, exec state loading), then the real document', async () => {
    __resetLanguageCacheForTests()
    const lcs = getCatalog('lcs')!
    render(wrap({ algoId: 'lcs', documents: lcs, ...stepProps(traces.lcs[2]!) }))
    const ed0 = cmWrap().querySelector('.cm-editor')
    act(() => {
      fireEvent.click(screen.getByTestId('tab-lang-python'))
    })
    expect(root().getAttribute('data-language')).toBe('python')
    expect(root().getAttribute('data-code-loading')).toBe('1')
    expect(screen.getByTestId('code-loading')).toBeTruthy()
    expect((screen.getByTestId('goto-exec-btn') as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(root().getAttribute('data-code-loading')).toBe('0'))
    expect(screen.queryByTestId('code-loading')).toBeNull()
    expect(cmWrap().getAttribute('data-cm-doc')).toBe('lcs.py')
    expect(cmWrap().querySelector('.cm-editor')).toBe(ed0)
    expect(screen.getByTestId('tab-lang-python').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('tab-ts').getAttribute('aria-pressed')).toBe('false')
  })

  for (const algo of ['lcs', 'kmp', 'floyd'] as const) {
    it(`${algo}: walking every frame in each language, the rendered exec line is semantically right (same .cm-editor)`, async () => {
      const cat = getCatalog(algo)!
      await loadAlgoLanguages(algo, cat.typescript.anchors)
      const steps = traces[algo]
      const { rerender } = render(wrap({ algoId: algo, documents: cat, ...stepProps(steps[0]!) }))
      const ed0 = cmWrap().querySelector('.cm-editor')
      const sem = SEMANTICS[algo]
      const fails: string[] = []
      for (const lang of ['typescript', ...LANGS]) {
        await pick(lang)
        const doc = lang === 'typescript' ? cat.typescript : peekLanguageDoc(algo, lang as never)!
        expect(cmWrap().getAttribute('data-cm-doc')).toBe(doc.documentId)
        steps.forEach((s, k) => {
          rerender(wrap({ algoId: algo, documents: cat, ...stepProps(s) }))
          const attr = cmWrap().getAttribute('data-exec-line') ?? ''
          const execLine = attr === '' ? null : Number(attr)
          const h = header()
          const domText = cmWrap().querySelector('.cm-exec-line')?.textContent ?? null
          // CodeMirror only renders lines inside its viewport (happy-dom has no layout), so the
          // weak lines / range end come from the wrapper's attributes, which mirror the decorations.
          const weakLines = (cmWrap().getAttribute('data-weak-lines') ?? '').split(',').filter(Boolean).map(Number)
          const endAttr = cmWrap().getAttribute('data-exec-end') ?? ''
          const rangeEnd = endAttr === '' ? null : Number(endAttr)
          if (domText != null && execLine != null && domText !== lines(doc)[execLine - 1]) fails.push(`${lang} frame ${k + 1}: DOM exec text ≠ doc line ${execLine}`)
          const f = execFailures(sem as never, doc, (sem.classify as (m: string) => string | null)(s.message) as never, {
            execLine,
            rangeEnd,
            headerDocId: h?.docId ?? null,
            headerLine: h?.line ?? null,
            domText,
            weakLines,
          })
          f.forEach((x) => fails.push(`${lang} frame ${k + 1}: ${x}`))
        })
        expect(cmWrap().querySelector('.cm-editor')).toBe(ed0)
      }
      expect(fails).toEqual([])
    }, 60_000)
  }

  it('copy copies the CURRENT language document', async () => {
    const lcs = getCatalog('lcs')!
    await loadAlgoLanguages('lcs', lcs.typescript.anchors)
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(wrap({ algoId: 'lcs', documents: lcs, ...stepProps(traces.lcs[2]!) }))
    for (const lang of ['rust', 'typescript', 'go'] as const) {
      await pick(lang)
      await act(async () => {
        fireEvent.click(screen.getByTestId('code-copy-btn'))
      })
      const want = lang === 'typescript' ? lcs.typescript.source : peekLanguageDoc('lcs', lang)!.source
      expect(writeText).toHaveBeenLastCalledWith(want)
    }
    expect(writeText).toHaveBeenCalledTimes(3)
  })

  it('the choice persists (localStorage) and applies to another algorithm on mount', async () => {
    const lcs = getCatalog('lcs')!
    const kmp = getCatalog('kmp')!
    await loadAlgoLanguages('kmp', kmp.typescript.anchors)
    render(wrap({ algoId: 'lcs', documents: lcs, ...stepProps(traces.lcs[2]!) }))
    await pick('java')
    expect(localStorage.getItem(CODE_LANGUAGE_STORAGE_KEY)).toBe('java')
    cleanup()
    render(wrap({ algoId: 'kmp', documents: kmp, ...stepProps(traces.kmp[2]!) }))
    await waitFor(() => expect(cmWrap().getAttribute('data-cm-doc')).toBe('kmp.java'))
    expect(root().getAttribute('data-language')).toBe('java')
  })

  it('an algorithm without that language shows TypeScript with an honest notice, and keeps the preference', async () => {
    localStorage.setItem(CODE_LANGUAGE_STORAGE_KEY, 'go')
    __reloadCodeLanguageForTests()
    // Since V28 Phase 3 every shipped catalog has six languages; an id without a language chunk
    // (e.g. a future algorithm that only ships TypeScript) still takes this path.
    const bubble = getCatalog('bubbleSort')!
    const s = getAlgo('bubbleSort')!.solve!({} as never).trace.steps[1] as Step
    render(wrap({ algoId: 'tsOnlyAlgorithm', documents: bubble, ...stepProps(s) }))
    expect(screen.getByTestId('code-lang-fallback').textContent).toMatch(/Go/)
    expect(root().getAttribute('data-language')).toBe('typescript')
    expect(cmWrap().getAttribute('data-cm-doc')).toBe(bubble.typescript.documentId)
    expect(screen.queryByTestId('tab-lang-go')).toBeNull()
    expect(localStorage.getItem(CODE_LANGUAGE_STORAGE_KEY)).toBe('go')
  })

  it('without algoId (legacy callers) only TypeScript is offered and nothing changes', () => {
    const lcs = getCatalog('lcs')!
    render(wrap({ documents: lcs, ...stepProps(traces.lcs[2]!) }))
    expect(screen.getByTestId('tab-ts')).toBeTruthy()
    expect(screen.queryByTestId('tab-lang-python')).toBeNull()
    expect(screen.getByTestId('tab-pseudo')).toBeTruthy()
  })
})
