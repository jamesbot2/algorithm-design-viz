/**
 * V28 P3: the knapsack teaching unit (/teach/knapsack) uses a per-strategy catalog. Every
 * strategy must offer the six-language switcher, and after a run the exec line in each language
 * must be the line whose text matches the anchor's signature (same table as the unit tests).
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KnapsackUnit from '../../src/pages/teaching/KnapsackUnit'
import { MotionProvider } from '../../src/theme/MotionContext'
import { LabThemeProvider } from '../../src/theme/LabThemeContext'
import { getCatalog } from '../../src/codeCatalog'
import { loadAlgoLanguages, peekLanguageDoc } from '../../src/codeCatalog/languages'
import { __reloadCodeLanguageForTests } from '../../src/codeCatalog/languagePreference'
import { P3 } from '../helpers/langSigTables'
import { norm, sigFor, type Lang } from '../helpers/langSignatures'

const wrap = (ui: ReactElement) => (
  <MemoryRouter>
    <LabThemeProvider>
      <MotionProvider>{ui}</MotionProvider>
    </LabThemeProvider>
  </MemoryRouter>
)
const STRATS: [string, string][] = [
  ['bruteForce', 'knapsack/brute'],
  ['dp2d', 'knapsack/dp2d'],
  ['dp1dCorrect', 'knapsack/dp1dCorrect'],
  ['dp1dWrong', 'knapsack/dp1dWrong'],
  ['backtracking', 'knapsack/backtracking'],
  ['branchAndBound', 'knapsack/branchAndBound'],
  ['greedy', 'knapsack/greedy'],
]
const LANGS = ['typescript', 'python', 'cpp', 'java', 'rust', 'go'] as const
const root = () => screen.getByTestId('code-browser')
const cmWrap = () => screen.getByTestId('code-mirror-wrap')
const anchorOfHeader = () => (document.querySelector('.code-browser-meta')?.textContent ?? '').match(/▶ (\S+) @(\S+):(\S+)/)

beforeEach(() => {
  localStorage.clear()
  __reloadCodeLanguageForTests()
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  __reloadCodeLanguageForTests()
})

describe('V28 P3 knapsack teaching unit — six languages per strategy', () => {
  for (const [strategy, dir] of STRATS) {
    it(`${strategy}: switcher present; after run every language locates the exec anchor`, async () => {
      const algoId = P3[dir]!.algoId === 'knapsack01' ? 'knapsack.dp2d' : P3[dir]!.algoId
      const cat = getCatalog(algoId)!
      await loadAlgoLanguages(algoId, cat.typescript.anchors)
      render(wrap(<KnapsackUnit />))
      fireEvent.change(screen.getByTestId('knapsack-strategy'), { target: { value: strategy } })
      await act(async () => {
        fireEvent.click(screen.getByTestId('run-btn'))
      })
      expect(screen.getByTestId('code-lang-switch')).toBeTruthy()
      const fails: string[] = []
      for (const lang of LANGS) {
        await act(async () => {
          fireEvent.click(screen.getByTestId(lang === 'typescript' ? 'tab-ts' : `tab-lang-${lang}`))
        })
        await waitFor(() => expect(root().getAttribute('data-code-loading')).toBe('0'))
        const doc = lang === 'typescript' ? cat.typescript : peekLanguageDoc(algoId, lang)!
        if (cmWrap().getAttribute('data-cm-doc') !== doc.documentId) fails.push(`${lang}: shows ${cmWrap().getAttribute('data-cm-doc')}`)
        const h = anchorOfHeader()
        const line = Number(cmWrap().getAttribute('data-exec-line') || 0)
        if (!h || !line) {
          fails.push(`${lang}: no exec location`)
          continue
        }
        if (h[2] !== doc.documentId) fails.push(`${lang}: header doc ${h[2]}`)
        const sig = P3[dir]!.sig.anchors[h[1]!]
        const re = sig ? sigFor(sig, lang as Lang) : null
        // signatures are defined over the anchor's whole range (e.g. Go's multi-line `dp := make(...)` + loop)
        const end = Number(cmWrap().getAttribute('data-exec-end') || line)
        const text = norm(lang as Lang, doc.source.split('\n').slice(line - 1, end).join('\n'))
        if (!re || !re.test(text)) fails.push(`${lang}: anchor ${h[1]} line ${line} "${text}"`)
      }
      expect(fails).toEqual([])
    }, 30_000)
  }
})
