/**
 * V28 Phase 2: LCS / KMP / Floyd in TypeScript, Python, C++, Java, Rust, Go (+ LCS pseudocode).
 *
 * Every frame of the default trace (and of small edge inputs) is resolved through the SAME entry
 * the code panel uses (semanticRefs → resolveStepInDocument) in every document, and judged by the
 * shared detector tests/helpers/multiLangSemantics.ts (statement meaning, enclosing branch chain,
 * weak condition line). Controls (dropped / mis-bound anchors) go through the same entry and must fail.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeAll } from 'vitest'
import { buildAll, parseAnnotated, sha256 } from '../scripts/gen-code-langs.mjs'
import { getCatalog } from '../src/codeCatalog'
import type { CodeDocument } from '../src/codeCatalog/types'
import { CODE_LANGUAGES } from '../src/codeCatalog/types'
import { availableLanguages, loadAlgoLanguages, peekLanguageDoc, multiLanguageAlgoIds } from '../src/codeCatalog/languages'
import { resolveStepInDocument, semanticRefs, anchorRange } from '../src/codeCatalog/resolve'
import { execFailures, SEMANTICS, type Phase2Algo } from './helpers/multiLangSemantics'
import type { Step } from '../src/types/step'
import * as lcsAlgo from '../src/algorithms/lcs'
import * as kmpAlgo from '../src/algorithms/kmp'
import * as floydAlgo from '../src/algorithms/floyd'

const INF = Infinity
const ALGOS: Phase2Algo[] = ['lcs', 'kmp', 'floyd']
const docsOf: Record<string, CodeDocument[]> = {}

beforeAll(async () => {
  for (const a of ALGOS) {
    const cat = getCatalog(a)!
    const lazy = await loadAlgoLanguages(a, cat.typescript.anchors)
    docsOf[a] = [cat.typescript, ...CODE_LANGUAGES.filter((l) => l !== 'typescript').map((l) => lazy.get(l)!)]
    if (cat.pseudocode) docsOf[a]!.push(cat.pseudocode)
  }
})

function trace(a: Phase2Algo, input?: unknown): Step[] {
  if (a === 'lcs') {
    const [x, y] = (input as [string, string]) ?? [lcsAlgo.meta.defaultX, lcsAlgo.meta.defaultY]
    return lcsAlgo.generateSteps([], x, y)
  }
  if (a === 'kmp') {
    const [t, p] = (input as [string, string]) ?? [kmpAlgo.meta.defaultText, kmpAlgo.meta.defaultPattern]
    return kmpAlgo.generateSteps([], t, p)
  }
  return floydAlgo.generateSteps([], (input as number[][]) ?? floydAlgo.meta.defaultMatrix)
}

/** The gap detector for one frame in one document (same resolution entry as the code panel). */
function frameFailures(a: Phase2Algo, doc: CodeDocument, step: Step): string[] {
  const sem = SEMANTICS[a] as (typeof SEMANTICS)[Phase2Algo]
  const refs = semanticRefs(step.codeRefs)
  const r = resolveStepInDocument(doc, refs)
  const ev = sem.classify(step.message) as never
  return execFailures(sem as never, doc, ev, {
    execLine: r.exec?.startLine ?? null,
    rangeEnd: r.exec?.endLine ?? null,
    headerDocId: r.documentId,
    weakLines: r.weakLines,
  })
}

function walk(a: Phase2Algo, doc: CodeDocument, steps: Step[]) {
  const out: string[] = []
  steps.forEach((s, k) => frameFailures(a, doc, s).forEach((f) => out.push(`frame ${k + 1}/${steps.length} "${s.message}": ${f}`)))
  return out
}

const withAnchors = (doc: CodeDocument, f: (a: CodeDocument['anchors']) => CodeDocument['anchors']): CodeDocument => ({ ...doc, anchors: f(doc.anchors.map((x) => ({ ...x, range: { ...x.range } }))) })
const lineOf = (doc: CodeDocument, re: RegExp, nth = 0) => {
  const hits = doc.source.split('\n').map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean)
  return hits[nth]!
}

describe('V28 generated language documents', () => {
  it('langs.generated.ts files are up to date with the real source files (markers stripped, sha256)', () => {
    const all = buildAll()
    expect(all.map((b) => b.dir).sort()).toEqual([...multiLanguageAlgoIds()].sort())
    for (const b of all) {
      expect(readFileSync(b.path, 'utf8'), `${b.path} stale — run node scripts/gen-code-langs.mjs`).toBe(b.text)
      for (const d of b.docs) {
        const raw = readFileSync(d.sourceFile, 'utf8')
        expect(d.source).toBe(parseAnnotated(raw, d.language).source)
        expect(d.sourceHash).toBe(sha256(d.source))
        expect(d.source).not.toMatch(/@a:/)
      }
    }
  })

  it('registry: six languages for LCS/KMP/Floyd, TypeScript only elsewhere; lazy docs load with labels', async () => {
    for (const a of ALGOS) {
      expect(availableLanguages(a)).toEqual([...CODE_LANGUAGES])
      const docs = docsOf[a]!
      const ids = docs.map((d) => d.documentId)
      expect(new Set(ids).size).toBe(ids.length)
      for (const d of docs.slice(1, 6)) {
        expect(peekLanguageDoc(a, d.language as never)).toBe(d)
        expect(d.title).toMatch(/\((Python|C\+\+|Java|Rust|Go)\)$/)
        expect(d.source.split('\n').length).toBeGreaterThan(10)
        for (const an of d.anchors) expect(an.label.length).toBeGreaterThan(0)
      }
    }
    expect(availableLanguages('bubbleSort')).toEqual(['typescript'])
    expect(availableLanguages(undefined)).toEqual(['typescript'])
  })

  it('anchor parity: every TypeScript anchor id exists, in range, in every language document', () => {
    for (const a of ALGOS) {
      const [ts, ...rest] = docsOf[a]!
      for (const d of rest.filter((x) => x.language !== 'pseudocode')) {
        for (const an of ts!.anchors) {
          expect(anchorRange(d, an.id), `${d.documentId} lacks a valid anchor "${an.id}"`).not.toBeNull()
        }
      }
    }
  })

  it('resolution ignores the ref documentId (semantic ids only)', () => {
    const py = docsOf.lcs!.find((d) => d.language === 'python')!
    const r = resolveStepInDocument(py, semanticRefs([{ documentId: 'lcs.ts', anchorId: 'dpFill', role: 'primary' }, { documentId: 'whatever', anchorId: 'compareChars', role: 'context' }]))
    expect(r.documentId).toBe('lcs.py')
    expect(py.source.split('\n')[r.exec!.startLine - 1]).toMatch(/max\(dp\[i - 1\]\[j\], dp\[i\]\[j - 1\]\)/)
    expect(r.weakLines.map((L) => py.source.split('\n')[L - 1]!.trim())).toContain('if X[i - 1] == Y[j - 1]:')
  })
})

describe('V28 default traces: every frame located semantically in every document', () => {
  for (const a of ALGOS) {
    it(`${a}: all frames classified; each document locates each frame's event`, () => {
      const steps = trace(a)
      const sem = SEMANTICS[a]
      const unclassified = steps.filter((s) => !(sem.classify as (m: string) => string | null)(s.message))
      expect(unclassified.map((s) => s.message)).toEqual([])
      const report: Record<string, number> = {}
      for (const d of docsOf[a]!) {
        const f = walk(a, d, steps)
        report[d.documentId] = steps.length - new Set(f.map((x) => x.split(':')[0])).size
        expect(f, `${d.documentId}`).toEqual([])
      }
      if (a === 'lcs') expect(steps.length).toBe(95)
      if (a === 'kmp') expect(steps.length).toBe(33)
    })
  }

  it('line numbers are each document\'s own: not copied from TS, no constant offset, no collapse', () => {
    for (const a of ALGOS) {
      const steps = trace(a)
      const sem = SEMANTICS[a]
      const evLine = (d: CodeDocument) => {
        const m = new Map<string, number>()
        for (const s of steps) {
          const ev = (sem.classify as (x: string) => string | null)(s.message)!
          m.set(ev, resolveStepInDocument(d, semanticRefs(s.codeRefs)).exec!.startLine)
        }
        return m
      }
      const [ts, ...rest] = docsOf[a]!
      const t = evLine(ts!)
      for (const d of rest) {
        const m = evLine(d)
        // Not copied: the language's own lines differ from TS for at least one event …
        expect([...m].some(([e, L]) => L !== t.get(e)), `${d.documentId}: identical to TS line numbers`).toBe(true)
        // … and grafting TS's anchor ranges (or TS ranges + the median offset) onto this document fails the detector.
        const tsRange = new Map(ts!.anchors.map((x) => [x.id, x.range]))
        const offs = [...m].map(([e, L]) => L - t.get(e)!).sort((x, y) => x - y)
        const med = offs[Math.floor(offs.length / 2)]!
        for (const shift of new Set([0, med])) {
          const grafted = withAnchors(d, (as) => as.map((x) => (tsRange.has(x.id) ? { ...x, range: { startLine: tsRange.get(x.id)!.startLine + shift, endLine: tsRange.get(x.id)!.endLine + shift } } : x)))
          if (shift !== 0 && [...m].every(([e, L]) => L - t.get(e)! === shift)) continue // a faithful mirror may share a uniform offset; meaning is checked by the walk
          expect(walk(a, grafted, steps).length, `${d.documentId}: TS line numbers (+${shift}) would pass`).toBeGreaterThan(0)
        }
        expect(new Set(m.values()).size, `${d.documentId}: events collapse onto one line`).toBe(m.size)
      }
    }
  })
})

describe('V28 edge inputs: every frame located in every document', () => {
  const cases: [Phase2Algo, unknown][] = [
    ...(['AAA/AAA', 'ABC/XYZ', 'ABC/A', 'A/ABC', 'A/A', 'A/B', '/AB', 'AB/', '/'] as const).map((s) => ['lcs', s.split('/')] as [Phase2Algo, unknown]),
    ...(['AAAAA/AA', 'ABCDEF/XYZ', 'ABABABAB/ABAB', 'abcabcabd/abcabd', 'A/A', 'ABC/', 'AAAA/AAAAA'] as const).map((s) => ['kmp', s.split('/')] as [Phase2Algo, unknown]),
    ['floyd', [[0, 5, INF, 10], [INF, 0, 3, INF], [INF, INF, 0, 1], [INF, INF, INF, 0]]],
    ['floyd', [[0, 4, INF], [INF, 0, -2], [3, INF, 0]]],
    ['floyd', [[0]]],
  ]
  for (const [a, input] of cases) {
    it(`${a} ${JSON.stringify(input)}`, () => {
      const steps = trace(a, input)
      for (const d of docsOf[a]!) expect(walk(a, d, steps), d.documentId).toEqual([])
    })
  }
})

describe('V28 controls through the same detector entry', () => {
  const docIn = (a: Phase2Algo, lang: string) => docsOf[a]!.find((d) => d.language === lang)!

  it('dropping python dpFill → exactly the 30 else-write frames fail; restoring passes', () => {
    const steps = trace('lcs')
    const py = docIn('lcs', 'python')
    const broken = withAnchors(py, (as) => as.filter((x) => x.id !== 'dpFill'))
    const f = walk('lcs', broken, steps)
    expect(f.length).toBe(30)
    expect(f.every((x) => /no execution line for elseWrite/.test(x))).toBe(true)
    expect(walk('lcs', py, steps)).toEqual([])
  })

  it('dropping go reconstructLeft → only the 2 left-move frames (91, 93) fail', () => {
    const steps = trace('lcs')
    const f = walk('lcs', withAnchors(docIn('lcs', 'go'), (as) => as.filter((x) => x.id !== 'reconstructLeft')), steps)
    expect(f.map((x) => x.match(/^frame (\d+)/)![1])).toEqual(['91', '93'])
  })

  it('java dpFill bound to the compare line → every else-write frame fails on meaning', () => {
    const j = docIn('lcs', 'java')
    const cmp = lineOf(j, /if \(X\.charAt\(i - 1\) == Y\.charAt\(j - 1\)\) \{/)
    const f = walk('lcs', withAnchors(j, (as) => as.map((x) => (x.id === 'dpFill' ? { ...x, range: { startLine: cmp, endLine: cmp } } : x))), trace('lcs'))
    expect(f.length).toBeGreaterThanOrEqual(30)
    expect(f.filter((x) => /is not the elseWrite statement/.test(x)).length).toBe(30)
  })

  it('cpp reconstructUp bound to the match branch `i--;` → enclosing-branch check fails', () => {
    const c = docIn('lcs', 'cpp')
    const iDec = lineOf(c, /^\s+i--;$/, 0) // first `i--;` = inside the match branch
    const f = walk('lcs', withAnchors(c, (as) => as.map((x) => (x.id === 'reconstructUp' ? { ...x, range: { startLine: iDec, endLine: iDec } } : x))), trace('lcs'))
    expect(f.length).toBeGreaterThan(0)
    expect(f.every((x) => /up: enclosing header/.test(x))).toBe(true)
  })

  it('rust KMP fallbackWrite bound to the hit-branch `j = lps[j - 1];` → fails', () => {
    const r = docIn('kmp', 'rust')
    const hitJ = lineOf(r, /j = lps\[j - 1\];/, 0)
    const f = walk('kmp', withAnchors(r, (as) => as.map((x) => (x.id === 'fallbackWrite' ? { ...x, range: { startLine: hitJ, endLine: hitJ } } : x))), trace('kmp'))
    expect(f.length).toBeGreaterThan(0)
    expect(f.every((x) => /fallbackWrite: enclosing header/.test(x))).toBe(true)
  })

  it('go Floyd update bound to the relax test, and an out-of-range anchor → both fail', () => {
    const g = docIn('floyd', 'go')
    const relax = g.anchors.find((x) => x.id === 'relax')!.range
    const f1 = walk('floyd', withAnchors(g, (as) => as.map((x) => (x.id === 'update' ? { ...x, range: { ...relax } } : x))), trace('floyd'))
    expect(f1.some((x) => /is not the update statement/.test(x))).toBe(true)
    const f2 = walk('floyd', withAnchors(g, (as) => as.map((x) => (x.id === 'done' ? { ...x, range: { startLine: 999, endLine: 999 } } : x))), trace('floyd'))
    expect(f2).toEqual([expect.stringMatching(/no execution line for done/)])
  })
})
