/**
 * V28 Phase 3: every remaining shipped algorithm in TypeScript + Python / C++ / Java / Rust / Go.
 *
 * For each algorithm (tests/helpers/langSigTables.ts) and each document:
 *   - registry: six languages, distinct document ids, titled, labelled anchors;
 *   - static gap detector (langSignatures.docFailures): every TS anchor exists, its statement
 *     matches the anchor's signature, block depth equals TypeScript's, no collapse;
 *   - every frame of the default trace and of small/edge inputs resolves through the code panel's
 *     own entry (semanticRefs → resolveStepInDocument) to a statement matching the signature of
 *     the frame's primary anchor; weak/context anchors exist;
 *   - the default trace is not mapped to one anchor (distinct primary anchors ≥ 3).
 * Controls (mis-bound / dropped anchors) go through the same detector and must fail.
 * Real execution against the app solver: scripts/check-code-langs.ts (needs toolchains, not CI).
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { getCatalog } from '../src/codeCatalog'
import type { CodeDocument } from '../src/codeCatalog/types'
import { CODE_LANGUAGES } from '../src/codeCatalog/types'
import { availableLanguages, languageDirOf, loadAlgoLanguages } from '../src/codeCatalog/languages'
import { pickPrimaryCodeRef } from '../src/utils/codeRefs'
import { docFailures, frameFailures } from './helpers/langSignatures'
import { P3 } from './helpers/langSigTables'
import { CASES } from '../scripts/lang-cases'

const DIRS = Object.keys(P3)
const docsOf: Record<string, CodeDocument[]> = {}

export function tsDocOf(algoId: string): { ts: CodeDocument; pseudo?: CodeDocument } {
  const cat = getCatalog(algoId)!
  return { ts: cat.typescript, pseudo: cat.pseudocode }
}

beforeAll(async () => {
  for (const d of DIRS) {
    const { ts, pseudo } = tsDocOf(P3[d]!.algoId)
    const lazy = await loadAlgoLanguages(P3[d]!.algoId, ts.anchors)
    docsOf[d] = [ts, ...CODE_LANGUAGES.filter((l) => l !== 'typescript').map((l) => lazy.get(l)!)]
    if (pseudo) docsOf[d]!.push(pseudo)
  }
})

describe('V28 P3 registry', () => {
  for (const d of DIRS) {
    it(`${d}: six languages, distinct ids, titles, labels, harness + case list`, () => {
      const { algoId } = P3[d]!
      expect(languageDirOf(algoId)).toBe(d)
      expect(availableLanguages(algoId)).toEqual([...CODE_LANGUAGES])
      const docs = docsOf[d]!
      expect(docs.slice(0, 6).every(Boolean)).toBe(true)
      const ids = docs.slice(0, 6).map((x) => x.documentId)
      expect(new Set(ids).size).toBe(6)
      for (const x of docs.slice(1, 6)) {
        expect(x.title).toMatch(/\((Python|C\+\+|Java|Rust|Go)\)$/)
        for (const an of x.anchors) expect(an.label.length).toBeGreaterThan(0)
      }
      expect(existsSync(join('scripts', 'lang-harness', d)), 'harness for check-code-langs').toBe(true)
      expect(typeof CASES[d]).toBe('function')
      expect(CASES[d]!().length).toBeGreaterThanOrEqual(5)
    })
  }
})

describe('V28 P3 static gap detector (signature, block depth, no collapse)', () => {
  for (const d of DIRS) {
    it(`${d}: TypeScript satisfies its own signatures; every other document matches`, () => {
      const [ts, ...rest] = docsOf[d]!
      expect(docFailures(ts!, ts!, P3[d]!.sig)).toEqual([])
      const f = rest.flatMap((x) => docFailures(ts!, x, P3[d]!.sig))
      expect(f).toEqual([])
    })
  }
})

describe('V28 P3 traces: every frame located in every document', () => {
  for (const d of DIRS) {
    it(`${d}: default + edge inputs`, () => {
      const traces = P3[d]!.traces()
      let frames = 0
      const f: string[] = []
      for (const t of traces) {
        for (const s of t.steps) {
          frames++
          for (const doc of docsOf[d]!) f.push(...frameFailures(doc, s, P3[d]!.sig).map((x) => `${t.name}#${s.id}: ${x}`))
        }
      }
      expect(f.slice(0, 20)).toEqual([])
      expect(frames).toBeGreaterThan(traces.length)
      const prim = new Set(traces[0]!.steps.map((s) => pickPrimaryCodeRef(s)?.anchorId))
      expect(prim.size, `default trace primaries: ${[...prim]}`).toBeGreaterThanOrEqual(3)
    })
  }
})

/** clone a document with one anchor moved to another document line (or dropped with line 0) */
function rebind(doc: CodeDocument, id: string, line: number): CodeDocument {
  return {
    ...doc,
    anchors: line
      ? doc.anchors.map((a) => (a.id === id ? { ...a, range: { startLine: line, endLine: line } } : a))
      : doc.anchors.filter((a) => a.id !== id),
  }
}
const lineOf = (doc: CodeDocument, re: RegExp, nth = 0) =>
  doc.source.split('\n').map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean)[nth]!

describe('V28 P3 controls through the same detector', () => {
  it('quickSort python: compare bound to the pivot line → static + frame checks fail', () => {
    const [ts, py] = [docsOf.quickSort![0]!, docsOf.quickSort!.find((x) => x.language === 'python')!]
    const bad = rebind(py, 'compare', lineOf(py, /pivot = arr\[R\]/))
    expect(docFailures(ts, bad, P3.quickSort!.sig).join('\n')).toMatch(/"compare" does not match/)
    const steps = P3.quickSort!.traces()[0]!.steps.filter((s) => pickPrimaryCodeRef(s)?.anchorId === 'compare')
    expect(steps.length).toBe(11)
    expect(steps.every((s) => frameFailures(bad, s, P3.quickSort!.sig).length > 0)).toBe(true)
  })
  it('mergeSort java: mergeCopyLeft bound to the in-loop write a[k] = left[i] → block depth fails', () => {
    const [ts, j] = [docsOf.mergeSort![0]!, docsOf.mergeSort!.find((x) => x.language === 'java')!]
    const bad = rebind(j, 'mergeCopyLeft', lineOf(j, /a\[k\] = left\[i\];/, 0))
    expect(docFailures(ts, bad, P3.mergeSort!.sig).join('\n')).toMatch(/"mergeCopyLeft" block depth 2 ≠ TypeScript 1/)
  })
  it('kadane go: updateBest dropped → missing anchor + all 4 update frames fail', () => {
    const [ts, g] = [docsOf.kadane![0]!, docsOf.kadane!.find((x) => x.language === 'go')!]
    const bad = rebind(g, 'updateBest', 0)
    expect(docFailures(ts, bad, P3.kadane!.sig).join('\n')).toMatch(/"updateBest" missing/)
    const steps = P3.kadane!.traces()[0]!.steps.filter((s) => pickPrimaryCodeRef(s)?.anchorId === 'updateBest')
    expect(steps.length).toBe(4)
    expect(steps.every((s) => frameFailures(bad, s, P3.kadane!.sig).length > 0)).toBe(true)
  })
  it('binarySearch rust: less bound onto the else branch → signature fails', () => {
    const [ts, r] = [docsOf.binarySearch![0]!, docsOf.binarySearch!.find((x) => x.language === 'rust')!]
    const bad = rebind(r, 'less', lineOf(r, /^\s*\} else \{/))
    expect(docFailures(ts, bad, P3.binarySearch!.sig).join('\n')).toMatch(/"less" does not match/)
  })
  it('bubbleSort cpp: swap and compare on the same line → collapse detected', () => {
    const [ts, c] = [docsOf.bubbleSort![0]!, docsOf.bubbleSort!.find((x) => x.language === 'cpp')!]
    const bad = rebind(c, 'swap', lineOf(c, /if \(arr\[j\] > arr\[j \+ 1\]\)/))
    expect(docFailures(ts, bad, P3.bubbleSort!.sig).join('\n')).toMatch(/collapse/)
  })
  it('editDistance python: replace bound to the match write dp[i][j] = dp[i-1][j-1] → signature + depth fail', () => {
    const [ts, py] = [docsOf.editDistance![0]!, docsOf.editDistance!.find((x) => x.language === 'python')!]
    const bad = rebind(py, 'replace', lineOf(py, /dp\[i\]\[j\] = dp\[i - 1\]\[j - 1\]$/))
    const f = docFailures(ts, bad, P3.editDistance!.sig).join('\n')
    expect(f).toMatch(/"replace" does not match/)
    const steps = P3.editDistance!.traces()[0]!.steps.filter((s) => pickPrimaryCodeRef(s)?.anchorId === 'replace')
    expect(steps.length).toBe(35)
    expect(steps.every((s) => frameFailures(bad, s, P3.editDistance!.sig).length > 0)).toBe(true)
  })
  it('nQueens go: backtrack bound to the place line → collapse + signature fail', () => {
    const [ts, g] = [docsOf.nQueens![0]!, docsOf.nQueens!.find((x) => x.language === 'go')!]
    const bad = rebind(g, 'backtrack', lineOf(g, /cols\[row\] = col\b/))
    const f = docFailures(ts, bad, P3.nQueens!.sig).join('\n')
    expect(f).toMatch(/"backtrack" does not match/)
    expect(f).toMatch(/"place" and "backtrack" collapse|"backtrack" and "place" collapse/)
  })
  it('knapsack dp2d java: takeWrite dropped → every takeWrite frame fails', () => {
    const [ts, j] = [docsOf['knapsack/dp2d']![0]!, docsOf['knapsack/dp2d']!.find((x) => x.language === 'java')!]
    const bad = rebind(j, 'takeWrite', 0)
    expect(docFailures(ts, bad, P3['knapsack/dp2d']!.sig).join('\n')).toMatch(/"takeWrite" missing/)
    const steps = P3['knapsack/dp2d']!.traces()[0]!.steps.filter((s) => pickPrimaryCodeRef(s)?.anchorId === 'takeWrite')
    expect(steps.length).toBe(18)
    expect(steps.every((s) => frameFailures(bad, s, P3['knapsack/dp2d']!.sig).length > 0)).toBe(true)
  })
})
