/**
 * V27: LCS pseudocode must locate every teaching event of the trace on its OWN statements.
 *
 * Every frame (default input + small edge inputs + the page's empty-input contract) is
 * resolved in BOTH documents through the same path the code browser uses
 * (pickPrimaryCodeRef → resolveExecRange on the shown document) and judged by the shared
 * gap detector (tests/helpers/lcsCodeSemantics.ts): exec line present, in range, the
 * statement performs the event, in the right branch, with its condition weakly lit.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { getAlgo } from '../src/algorithms/registry'
import { getCatalog } from '../src/codeCatalog'
import { LCS_PSEUDO_HASH } from '../src/codeCatalog/lcs'
import { resolveExecRange } from '../src/components/codeBrowser/resolveExec'
import type { CodeDocument } from '../src/codeCatalog/types'
import type { Step } from '../src/types/step'
import { pickPrimaryCodeRef, weakContextRefs } from '../src/utils/codeRefs'
import { classifyLcsMessage, enclosingHeaders, lcsExecFailures, type LcsEvent } from './helpers/lcsCodeSemantics'

const cat = getCatalog('lcs')!
const TS = cat.typescript
const PSEUDO = cat.pseudocode!

function solve(input: { x?: string; y?: string }) {
  const r = getAlgo('lcs')!.solve!(input as never)
  return { steps: (r.trace.steps ?? []) as Step[], result: r.result as { ok: boolean; length: number; lcs: string } }
}

/** What the code browser shows for `step` on `doc` (same resolution as CodeBrowser). */
function shownOn(doc: CodeDocument, step: Step) {
  const range = resolveExecRange(doc, pickPrimaryCodeRef(step)?.anchorId)
  const weakLines = weakContextRefs(step)
    .map((r) => resolveExecRange(doc, r.anchorId)?.startLine)
    .filter((x): x is number => typeof x === 'number')
  return { range, execLine: range?.startLine ?? null, weakLines }
}

function gaps(doc: CodeDocument, steps: Step[]) {
  const out: string[] = []
  steps.forEach((s, k) => {
    const sh = shownOn(doc, s)
    const fails = lcsExecFailures(doc, classifyLcsMessage(s.message ?? ''), sh)
    if (sh.range && (sh.range.endLine < sh.range.startLine || sh.range.endLine > doc.source.split('\n').length)) {
      fails.push(`${doc.documentId}: anchor range ${JSON.stringify(sh.range)} invalid`)
    }
    for (const f of fails) out.push(`frame ${k + 1}/${steps.length} "${s.message}": ${f}`)
  })
  return out
}

const SMALL: { name: string; x: string; y: string; frames: number; moves: string; lcs: string }[] = [
  { name: 'all-equal', x: 'AAA', y: 'AAA', frames: 24, moves: 'MMM', lcs: 'AAA' },
  { name: 'totally unequal (ties → up only)', x: 'ABC', y: 'XYZ', frames: 24, moves: 'UUU', lcs: '' },
  { name: 'only up', x: 'ABC', y: 'A', frames: 12, moves: 'UUM', lcs: 'A' },
  { name: 'only left', x: 'A', y: 'ABC', frames: 12, moves: 'LLM', lcs: 'A' },
  { name: 'single char equal', x: 'A', y: 'A', frames: 6, moves: 'M', lcs: 'A' },
  { name: 'single char unequal', x: 'A', y: 'B', frames: 6, moves: 'U', lcs: '' },
  { name: 'empty X (page empty-input contract)', x: '', y: 'AB', frames: 3, moves: '', lcs: '' },
  { name: 'empty Y', x: 'AB', y: '', frames: 3, moves: '', lcs: '' },
  { name: 'both empty', x: '', y: '', frames: 3, moves: '', lcs: '' },
]

describe('V27 LCS pseudocode anchors', () => {
  it('default trace is unchanged (95 frames, same messages and codeRefs as d6adc19)', () => {
    const { steps, result } = solve({})
    expect(steps.length).toBe(95)
    expect(result).toEqual({ ok: true, length: 4, lcs: 'BCBA' })
    const fp = createHash('sha256')
      .update(JSON.stringify(steps.map((s) => [s.phase, s.message, s.codeRefs ?? null])))
      .digest('hex')
    expect(fp).toBe('1a7195ed96442ff67a2968a0eb4b944a3e8bd8f6765ff0ec31da3df70742c90d')
  })

  it('every default frame is classified; the 9 event types all occur', () => {
    const { steps } = solve({})
    const seen = new Set<LcsEvent>()
    steps.forEach((s, k) => {
      const e = classifyLcsMessage(s.message ?? '')
      expect(e, `frame ${k + 1} "${s.message}"`).not.toBeNull()
      seen.add(e!)
    })
    expect([...seen].sort()).toEqual(
      ['compare', 'diagonal', 'done', 'elseWrite', 'init', 'left', 'match', 'reconstructStart', 'up'].sort(),
    )
  })

  it('TypeScript: default frames 1..95 all map to the statement of their event', () => {
    expect(gaps(TS, solve({}).steps)).toEqual([])
  })

  it('pseudocode: default frames 1..95 all map to the statement of their event', () => {
    expect(gaps(PSEUDO, solve({}).steps)).toEqual([])
  })

  it('key frames 3/87/89/91/93/95: else write, up, up, left, left, return — in both documents', () => {
    const { steps } = solve({})
    const want: [number, LcsEvent][] = [[3, 'elseWrite'], [87, 'up'], [89, 'up'], [91, 'left'], [93, 'left'], [95, 'done']]
    for (const [k, ev] of want) {
      const s = steps[k - 1]!
      expect(classifyLcsMessage(s.message ?? ''), `frame ${k}`).toBe(ev)
      for (const doc of [TS, PSEUDO]) {
        const sh = shownOn(doc, s)
        expect(lcsExecFailures(doc, ev, sh), `frame ${k} on ${doc.documentId}`).toEqual([])
      }
    }
    // frame 3 shows the explicit else-write, not the compare line
    const f3p = shownOn(PSEUDO, steps[2]!).execLine!
    expect(PSEUDO.source.split('\n')[f3p - 1]).toMatch(/max\(/)
  })

  it('pseudo lines are the pseudocode\'s own: no copied TS numbers, no constant offset, no collapse onto one line', () => {
    const { steps } = solve({})
    const perEvent = new Map<LcsEvent, { ts: number; ps: number }>()
    for (const s of steps) {
      const e = classifyLcsMessage(s.message ?? '')!
      perEvent.set(e, { ts: shownOn(TS, s).execLine!, ps: shownOn(PSEUDO, s).execLine! })
    }
    const vals = [...perEvent.values()]
    expect(vals.every((v) => v.ps > 0)).toBe(true)
    expect(new Set(vals.map((v) => v.ts - v.ps)).size, JSON.stringify(Object.fromEntries(perEvent))).toBeGreaterThan(1)
    expect(new Set(vals.map((v) => v.ps)).size, 'distinct pseudo lines per event').toBe(perEvent.size)
  })

  it('backtrack/return are real pseudo operations (not a one-line summary)', () => {
    const lines = PSEUDO.source.split('\n')
    const byId = (id: string) => PSEUDO.anchors.find((a) => a.id === id)?.range
    const ids = ['reconstructStart', 'reconstruct', 'reconstructUp', 'reconstructLeft', 'done']
    const starts = ids.map((id) => byId(id)?.startLine)
    expect(starts.every((x) => typeof x === 'number'), JSON.stringify(starts)).toBe(true)
    expect(new Set(starts).size).toBe(ids.length)
    // match collects AND moves diagonally within its range
    const rec = byId('reconstruct')!
    const recText = lines.slice(rec.startLine - 1, rec.endLine).join('\n')
    expect(recText).toMatch(/append X\[i-1\] to S/)
    expect(recText).toMatch(/i ← i-1;\s*j ← j-1/)
    // the condition anchor is the tie-break test and is a different line than the moves
    const cond = byId('reconstructCompare')!
    expect(lines[cond.startLine - 1]).toMatch(/else if dp\[i-1\]\[j\] ≥ dp\[i\]\[j-1\]/)
    expect(enclosingHeaders(lines, byId('reconstructUp')!.startLine)[0]).toBe(cond.startLine)
  })

  it('pseudocode tie rule and index conventions match src/algorithms/lcs.ts', async () => {
    const fs = await import('node:fs')
    const impl = fs.readFileSync(new URL('../src/algorithms/lcs.ts', import.meta.url), 'utf8')
    // implementation: ties (dp[i-1][j] >= dp[i][j-1]) move up; X[i-1] vs Y[j-1]; (m+1)×(n+1)
    expect(impl).toMatch(/dp\[i - 1\]!\[j\]! >= dp\[i\]!\[j - 1\]!/)
    expect(PSEUDO.source).toMatch(/else if dp\[i-1\]\[j\] ≥ dp\[i\]\[j-1\]:/)
    expect(PSEUDO.source).not.toMatch(/dp\[i\]\[j-1\] ≥ dp\[i-1\]\[j\]/)
    expect(PSEUDO.source).toMatch(/if X\[i-1\] = Y\[j-1\]:/)
    expect(PSEUDO.source).toMatch(/\(m\+1\)×\(n\+1\)/)
    expect(PSEUDO.source).toMatch(/i ← m;\s*j ← n/)
    // replaying the pseudocode's backtrack decisions on the trace gives the trace's moves
    for (const input of [{}, ...SMALL.map(({ x, y }) => ({ x, y }))]) {
      const { steps, result } = solve(input)
      const X = (input as { x?: string }).x ?? 'ABCBDAB'
      const Y = (input as { y?: string }).y ?? 'BDCABA'
      const m = X.length, nY = Y.length
      const dp = Array.from({ length: m + 1 }, () => Array(nY + 1).fill(0) as number[])
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= nY; j++)
          dp[i]![j] = X[i - 1] === Y[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      let i = m, j = nY
      const S: string[] = []
      for (const s of steps) {
        const e = classifyLcsMessage(s.message ?? '')
        if (e !== 'match' && e !== 'up' && e !== 'left') continue
        // pseudocode lines 12-19, executed literally
        const want: LcsEvent = X[i - 1] === Y[j - 1] ? 'match' : dp[i - 1]![j]! >= dp[i]![j - 1]! ? 'up' : 'left'
        expect(e, `${JSON.stringify(input)} at (${i},${j}) "${s.message}"`).toBe(want)
        if (want === 'match') { S.push(X[i - 1]!); i--; j-- } else if (want === 'up') i--; else j--
        expect(s.message).toContain(`(${i},${j})`)
      }
      expect(S.reverse().join('')).toBe(result.lcs)
      expect(dp[m]![nY]).toBe(result.length)
    }
  })

  for (const c of SMALL) {
    it(`small input ${c.name}: X="${c.x}" Y="${c.y}" — both documents map every frame`, () => {
      const { steps, result } = solve({ x: c.x, y: c.y })
      expect(steps.length).toBe(c.frames)
      expect(result.lcs).toBe(c.lcs)
      const moves = steps
        .map((s) => classifyLcsMessage(s.message ?? ''))
        .map((e) => (e === 'match' ? 'M' : e === 'up' ? 'U' : e === 'left' ? 'L' : ''))
        .join('')
      expect(moves).toBe(c.moves)
      expect(gaps(TS, steps)).toEqual([])
      expect(gaps(PSEUDO, steps)).toEqual([])
    })
  }

  it('pseudo document identity and hash', () => {
    expect(PSEUDO.documentId).toBe('lcs.pseudo')
    expect(PSEUDO.language).toBe('pseudocode')
    expect(PSEUDO.title).not.toMatch(/TypeScript/)
    const sha = createHash('sha256').update(PSEUDO.source).digest('hex')
    expect(PSEUDO.sourceHash).toBe(sha)
    expect(LCS_PSEUDO_HASH).toBe(sha)
    const n = PSEUDO.source.split('\n').length
    for (const a of PSEUDO.anchors) {
      expect(a.range.startLine, a.id).toBeGreaterThanOrEqual(1)
      expect(a.range.endLine, a.id).toBeLessThanOrEqual(n)
      expect(a.range.startLine, a.id).toBeLessThanOrEqual(a.range.endLine)
    }
  })

  it('every anchor id any LCS frame refers to exists in the pseudo document', () => {
    const used = new Set<string>()
    for (const input of [{}, ...SMALL.map(({ x, y }) => ({ x, y }))]) {
      for (const s of solve(input).steps) for (const r of s.codeRefs ?? []) used.add(r.anchorId)
    }
    const missing = [...used].filter((id) => !PSEUDO.anchors.some((a) => a.id === id))
    expect(missing).toEqual([])
  })
})

describe('V27 gap detector controls (same detector, injected mis-bindings)', () => {
  const steps = solve({}).steps
  const withAnchors = (doc: CodeDocument, patch: (a: CodeDocument['anchors']) => CodeDocument['anchors']): CodeDocument => ({
    ...doc,
    anchors: patch(doc.anchors.map((a) => ({ ...a, range: { ...a.range } }))),
  })

  it('removing the pseudo dpFill anchor is caught (30 frames)', () => {
    const doc = withAnchors(PSEUDO, (as) => as.filter((a) => a.id !== 'dpFill'))
    const g = gaps(doc, steps)
    expect(g.filter((x) => /no execution line for elseWrite/.test(x)).length).toBe(30)
  })

  it('removing one backtrack anchor (reconstructLeft) is caught (frames 91, 93)', () => {
    const doc = withAnchors(PSEUDO, (as) => as.filter((a) => a.id !== 'reconstructLeft'))
    const g = gaps(doc, steps)
    expect(g.map((x) => x.match(/^frame (\d+)/)![1])).toEqual(['91', '93'])
  })

  it('binding dpFill to the compare line is caught semantically', () => {
    const doc = withAnchors(PSEUDO, (as) => {
      const cmp = as.find((a) => a.id === 'compareChars')!
      return as.map((a) => (a.id === 'dpFill' ? { ...a, range: { ...cmp.range } } : a))
    })
    const g = gaps(doc, steps)
    expect(g.filter((x) => /is not the elseWrite statement/.test(x)).length).toBe(30)
  })

  it('swapping up/left statements is caught by the branch check', () => {
    const doc = withAnchors(PSEUDO, (as) => {
      const up = as.find((a) => a.id === 'reconstructUp')!.range
      const left = as.find((a) => a.id === 'reconstructLeft')!.range
      return as.map((a) => (a.id === 'reconstructUp' ? { ...a, range: left } : a.id === 'reconstructLeft' ? { ...a, range: up } : a))
    })
    expect(gaps(doc, steps).length).toBeGreaterThanOrEqual(4)
  })
})
