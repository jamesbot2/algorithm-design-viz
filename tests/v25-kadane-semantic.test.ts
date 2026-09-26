/**
 * V25-01: Kadane frames ↔ complete TypeScript document, by semantic anchor.
 * Every assertion reads the CodeDocument statement text through the frame's anchor —
 * never "execLine > 0" or "an arrow exists".
 */
import { describe, expect, it } from 'vitest'
import { generateSteps } from '../src/algorithms/kadane'
import { getCatalog, numericLineFallback, NUMERIC_LINE_FALLBACK } from '../src/codeCatalog'
import { pickPrimaryCodeRef, weakContextRefs } from '../src/utils/codeRefs'
import type { Step } from '../src/types/step'

const DEFAULT = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
const doc = getCatalog('kadane')!.typescript
const lines = doc.source.split('\n')
const anchor = (id: string) => doc.anchors.find((a) => a.id === id)!
/** Statement text of the arrow line (anchor start) and the whole anchored range. */
function stmt(step: Step) {
  const p = pickPrimaryCodeRef(step)!
  const a = anchor(p.anchorId)
  expect(a, `anchor ${p.anchorId} resolves`).toBeTruthy()
  return {
    id: p.anchorId,
    line: a.range.startLine,
    arrow: lines[a.range.startLine - 1]!.trim(),
    range: lines.slice(a.range.startLine - 1, a.range.endLine).map((l) => l.trim()),
    weak: weakContextRefs(step).map((r) => lines[anchor(r.anchorId).range.startLine - 1]!.trim()),
  }
}

/**
 * Independent execution of the reference algorithm (same tie rules as kadane.ts),
 * emitting the expected event sequence + variable values after each event.
 */
function referenceEvents(a: number[]) {
  const ev: { kind: string; vars: Record<string, number> }[] = []
  let best = a[0]!
  let cur = a[0]!
  let bestStart = 0
  let bestEnd = 0
  let curStart = 0
  ev.push({ kind: 'init', vars: { best, cur, bestStart, bestEnd, curStart } })
  for (let i = 1; i < a.length; i++) {
    ev.push({ kind: 'loopVisit', vars: { i, cur, curStart, best, bestStart, bestEnd } })
    if (cur + a[i]! < a[i]!) {
      cur = a[i]!
      curStart = i
      ev.push({ kind: 'resetWrite', vars: { i, cur, curStart, best, bestStart, bestEnd } })
    } else {
      cur = cur + a[i]!
      ev.push({ kind: 'extendWrite', vars: { i, cur, curStart, best, bestStart, bestEnd } })
    }
    if (cur > best) {
      best = cur
      bestStart = curStart
      bestEnd = i
      ev.push({ kind: 'updateBest', vars: { i, cur, curStart, best, bestStart, bestEnd } })
    }
  }
  ev.push({ kind: 'done', vars: { best, bestStart, bestEnd } })
  return ev
}

const EXPECT_TEXT: Record<string, (s: ReturnType<typeof stmt>) => void> = {
  init: (s) => {
    expect(s.arrow).toBe('let best = a[0]!')
    expect(s.range).toEqual(['let best = a[0]!', 'let cur = a[0]!', 'let bestStart = 0', 'let bestEnd = 0', 'let curStart = 0'])
  },
  loopVisit: (s) => expect(s.arrow).toBe('for (let i = 1; i < a.length; i++) {'),
  resetWrite: (s) => {
    expect(s.range).toEqual(['cur = a[i]!', 'curStart = i'])
    expect(s.weak).toEqual(['if (cur + a[i]! < a[i]!) {'])
  },
  extendWrite: (s) => {
    expect(s.range).toEqual(['cur = cur + a[i]!'])
    expect(s.weak).toEqual(['if (cur + a[i]! < a[i]!) {'])
  },
  updateBest: (s) => {
    expect(s.range).toEqual(['best = cur', 'bestStart = curStart', 'bestEnd = i'])
    expect(s.weak).toEqual(['if (cur > best) {'])
  },
  done: (s) => expect(s.arrow).toBe('return { best, start: bestStart, end: bestEnd }'),
}

function checkRun(a: number[]) {
  const steps = generateSteps(a)
  const ref = referenceEvents(a)
  expect(steps.map((s) => pickPrimaryCodeRef(s)?.anchorId)).toEqual(ref.map((e) => e.kind))
  steps.forEach((s, k) => {
    const st = stmt(s)
    EXPECT_TEXT[st.id]!(st)
    // never the declaration / doc comment / closing braces
    expect(st.arrow.startsWith('export function')).toBe(false)
    expect(st.arrow.startsWith('/**')).toBe(false)
    // one execution context: vars ARE the reference code's variables, same values
    expect(s.vars, `frame ${k + 1} vars`).toEqual(ref[k]!.vars)
    // no legacy numeric line on any Kadane frame
    expect(s.codeLine).toBeUndefined()
  })
  return steps
}

describe('V25-01 Kadane semantic code refs', () => {
  it('default input: 22 frames, each frame → correct statement + real variables', () => {
    const steps = checkRun(DEFAULT)
    expect(steps).toHaveLength(22)
    const f7 = steps[6]!
    expect(f7.message).toBe('考察 a[3] = 4')
    expect(f7.vars.i).toBe(3)
    const s7 = stmt(f7)
    expect(s7.id).toBe('loopVisit')
    expect(s7.line).toBe(9)
    expect(s7.arrow).toBe('for (let i = 1; i < a.length; i++) {')
    expect(lines[1]).toContain('export function kadane') // line 2 is the declaration — not the arrow
    const kinds = new Set(steps.map((s) => pickPrimaryCodeRef(s)!.anchorId))
    for (const k of ['init', 'loopVisit', 'resetWrite', 'extendWrite', 'updateBest', 'done']) expect(kinds.has(k), k).toBe(true)
    // a "not updated" iteration: visit i with cur <= best → next frame is the next visit/done with best unchanged
    const noUpdate = steps.findIndex((s, k) => {
      const id = pickPrimaryCodeRef(s)!.anchorId
      const nxt = steps[k + 1]
      return (id === 'extendWrite' || id === 'resetWrite') && nxt && pickPrimaryCodeRef(nxt)!.anchorId !== 'updateBest'
    })
    expect(noUpdate).toBeGreaterThan(0)
    const after = steps[noUpdate + 1]!
    expect(after.vars.best).toBe(steps[noUpdate]!.vars.best)
    expect(after.vars.bestStart).toBe(steps[noUpdate]!.vars.bestStart)
    const last = steps[21]!
    expect(last.result).toMatchObject({ hasSubarray: true, best: 6, range: [3, 6] })
  })

  it('[1,-1]: non-empty best is the single element 1 at [0,0]', () => {
    const s = checkRun([1, -1])
    expect(s.at(-1)!.result).toMatchObject({ hasSubarray: true, best: 1, range: [0, 0] })
  })
  it('[-4,-2,-5] all negative: best is the largest element, single-point range', () => {
    const s = checkRun([-4, -2, -5])
    expect(s.at(-1)!.result).toMatchObject({ hasSubarray: true, best: -2, range: [1, 1] })
    expect(s.some((x) => pickPrimaryCodeRef(x)!.anchorId === 'resetWrite')).toBe(true)
  })
  it('[0,0] ties: extend on tie (strict <), keep earliest best (strict >) → [0,0]', () => {
    const s = checkRun([0, 0])
    expect(s.at(-1)!.result).toMatchObject({ hasSubarray: true, best: 0, range: [0, 0] })
    expect(s.some((x) => pickPrimaryCodeRef(x)!.anchorId === 'extendWrite')).toBe(true)
    expect(s.some((x) => pickPrimaryCodeRef(x)!.anchorId === 'updateBest')).toBe(false)
  })
  it('[3] single element: init → done', () => {
    const s = checkRun([3])
    expect(s).toHaveLength(2)
  })
  it('empty input keeps the solver contract (hasSubarray=false, best=null) and maps to the empty branch', () => {
    const s = generateSteps([])
    expect(s).toHaveLength(1)
    expect(s[0]!.result).toEqual({ ok: true, hasSubarray: false, best: null, range: null })
    const st = stmt(s[0]!)
    expect(st.id).toBe('emptyInput')
    expect(st.arrow.startsWith('if (a.length === 0) return null')).toBe(true)
    // the reference document no longer claims a sum-0 subarray for empty input
    expect(doc.source).not.toContain('best: 0, start: 0, end: -1')
  })
})

describe('V25-01 numeric-line fallback policy', () => {
  it('Kadane forbids numeric meta.code fallback; unverified modules keep legacy behaviour (listed, not fixed)', () => {
    expect(numericLineFallback('kadane')).toBe('forbidden')
    expect(Object.keys(NUMERIC_LINE_FALLBACK)).toEqual(['kadane'])
    for (const id of ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort', 'binarySearch', 'lcs', 'floyd', 'editDistance', 'knapsack01']) {
      expect(numericLineFallback(id)).toBe('legacy-unverified')
    }
  })
})
