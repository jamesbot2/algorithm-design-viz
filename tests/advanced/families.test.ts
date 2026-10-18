/**
 * Generic family tests: every family (a) solves its default draft with a non-trivial trace,
 * (b) emits only anchors that exist in ALL six displayed documents (no fake / missing mapping),
 * (c) matches an INDEPENDENT reference below on fixed-seed random inputs,
 * (d) rejects invalid drafts with a field-level issue (no silent clamping).
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { advancedEntries } from '../../src/algorithms/advanced/registry'
import type { AdvancedAlgoId } from '../../src/algorithms/advanced/registry'
import { FAMILIES } from '../../src/algorithms/advanced/families'
import { SOURCE_HASHES } from '../../src/features/advanced/templates/hashes.generated'
import type { Step } from '../../src/types/step'
import type { FamView } from '../../src/types/advancedView'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
function prng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const ri = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
const draftOf = (o: Record<string, number | number[]>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)]))
const solve = (id: AdvancedAlgoId, d: Record<string, number | number[]>) => {
  const e = advancedEntries[id]
  const p = e.parseDraft(draftOf(d))
  if (!p.ok) throw new Error(JSON.stringify(p.issues))
  return e.solve(p.value) as { steps: Step[]; result: any }
}
const fv = (s: Step) => s.advanced as FamView

const docsGlob = import.meta.glob('../../src/codeCatalog/*/langs.generated.ts', { eager: true }) as Record<string, { default: { language: string; source: string; anchors: { id: string }[] }[] }>
const idxGlob = import.meta.glob('../../src/codeCatalog/*/index.ts', { eager: true }) as Record<string, Record<string, () => { typescript: { language: string; source: string; anchors: { id: string }[] } }>>
const allDocs = (dir: string) => {
  const six = docsGlob[`../../src/codeCatalog/${dir}/langs.generated.ts`]!.default
  const m = idxGlob[`../../src/codeCatalog/${dir}/index.ts`]!
  const ts = Object.values(m).find((f) => typeof f === 'function')!().typescript
  return [ts, ...six]
}

describe('generic families: contract', () => {
  for (const f of FAMILIES) {
    it(`${f.id}: default draft solves; anchors exist in all six documents; hashes bound; invalid drafts rejected`, () => {
      const e = advancedEntries[f.id]
      const r = e.solve((e.parseDraft(f.defaultDraft) as { ok: true; value: unknown }).value)
      expect(r.steps.length).toBeGreaterThan(5)
      expect(r.steps.map((s, i) => s.id === i).every(Boolean)).toBe(true)
      expect(r.steps.every((s) => s.advanced?.kind === 'fam')).toBe(true)
      const need = new Set(r.steps.flatMap((s) => (s.codeRefs ?? []).map((c) => c.anchorId)))
      expect(need.size).toBeGreaterThanOrEqual(3)
      const docs = allDocs(f.catalogId)
      expect(docs.map((d) => d.language).sort()).toEqual(['cpp', 'go', 'java', 'python', 'rust', 'typescript'])
      for (const d of docs) {
        const ids = new Set(d.anchors.map((a) => a.id))
        for (const a of need) expect(ids.has(a), `${f.catalogId}/${d.language} lacks anchor ${a}`).toBe(true)
        expect(d.source).not.toContain('@a:')
        expect(sha(d.source)).toBe(SOURCE_HASHES[f.id]!.teach![d.language])
      }
      // every field rejects garbage with a field-level issue
      for (const fld of f.fields) {
        const bad = e.parseDraft({ ...f.defaultDraft, [fld.key]: 'x1' })
        expect(bad.ok, `${f.id}.${fld.key} accepted garbage`).toBe(false)
        if (!bad.ok) expect(bad.issues[0]!.field).toBe(fld.key)
      }
      expect(e.validate({}).ok).toBe(false)
    })
  }
})

describe('prefix-diff vs independent reference', () => {
  it('prefix row, range sums and difference restore equal brute force on random inputs', () => {
    const r = prng(5)
    for (let c = 0; c < 200; c++) {
      const n = ri(r, 1, 12)
      const arr = Array.from({ length: n }, () => ri(r, -30, 30))
      const ups: number[] = []
      for (let i = ri(r, 0, 4); i > 0; i--) {
        const l = ri(r, 0, n)
        ups.push(l, ri(r, l, n), ri(r, -9, 9))
      }
      const qs: number[] = []
      for (let i = ri(r, 0, 5); i > 0; i--) {
        const l = ri(r, 0, n)
        qs.push(l, ri(r, l, n))
      }
      const { steps, result } = solve('prefix-diff', { arr, ups, qs })
      const direct = [0, ...arr.map((_, i) => arr.slice(0, i + 1).reduce((s, v) => s + v, 0))]
      expect(result.prefix).toEqual(direct)
      expect(result.answers).toEqual(Array.from({ length: qs.length / 2 }, (_, i) => arr.slice(qs[2 * i]!, qs[2 * i + 1]!).reduce((s, v) => s + v, 0)))
      const fin = [...arr]
      for (let i = 0; i < ups.length; i += 3) for (let j = ups[i]!; j < ups[i + 1]!; j++) fin[j]! += ups[i + 2]!
      expect(result.final).toEqual(fin)
      // the SCENE cells of the last frame equal the reference (not the data table)
      const last = fv(steps[steps.length - 1]!)
      expect(last.rows.find((x) => x.id === 'out')!.cells).toEqual(fin)
      expect(last.rows.find((x) => x.id === 'p')!.cells).toEqual(direct)
    }
  })
  it('counterexample: abandoning n+1 slots / wrong cancel point changes the answer (d[r+1] instead of d[r])', () => {
    const { result } = solve('prefix-diff', { arr: [0, 0, 0], ups: [0, 2, 5], qs: [] })
    expect(result.final).toEqual([5, 5, 0])
    const wrong = [0, 0, 0, 0, 0].map(() => 0)
    wrong[0]! += 5
    wrong[3]! -= 5 // the buggy cancel point d[r+1]
    let run = 0
    expect([0, 1, 2].map((i) => (run += wrong[i]!))).toEqual([5, 5, 5])
  })
})

describe('discretize vs independent reference', () => {
  it('unique, ranks and query counts equal set-based brute force; ranks are compact and order-preserving', () => {
    const r = prng(9)
    for (let c = 0; c < 200; c++) {
      const arr = Array.from({ length: ri(r, 1, 12) }, () => ri(r, -6, 6))
      const qs = Array.from({ length: ri(r, 0, 6) }, () => ri(r, -8, 8))
      const { steps, result } = solve('discretize', { arr, qs })
      const dist = [...new Set(arr)].sort((x, y) => x - y)
      const less = (x: number) => dist.filter((v) => v < x).length
      expect(result.unique).toEqual(dist)
      expect(result.ranks).toEqual(arr.map(less))
      expect(result.queryRanks).toEqual(qs.map(less))
      expect([...new Set(result.ranks as number[])].sort((a, b) => a - b)).toEqual(dist.map((_, i) => i)) // compact 0..m-1
      for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) expect(Math.sign(arr[i]! - arr[j]!)).toBe(Math.sign(result.ranks[i] - result.ranks[j]))
      const last = fv(steps[steps.length - 1]!)
      expect(last.rows.find((x) => x.id === 'r')!.cells).toEqual(arr.map(less))
    }
  })
  it('counterexample: skipping the dedup step leaves holes in the ranks (a=[5,5,7] → [0,0,2])', () => {
    const sorted = [5, 5, 7]
    const lbound = (x: number) => sorted.findIndex((v) => v >= x)
    expect([5, 5, 7].map(lbound)).toEqual([0, 0, 2])
    expect(solve('discretize', { arr: [5, 5, 7], qs: [] }).result.ranks).toEqual([0, 0, 1])
  })
})

describe('bs-answer vs independent reference', () => {
  const brute = (a: number[], k: number) => {
    let best = Infinity
    const go = (i: number, parts: number, mx: number) => {
      if (i === a.length) return void (best = Math.min(best, mx))
      if (parts === k) return
      let s = 0
      for (let j = i; j < a.length; j++) {
        s += a[j]!
        go(j + 1, parts + 1, Math.max(mx, s))
      }
    }
    go(0, 0, 0)
    return best
  }
  it('answer equals exhaustive partition search; every tested cap ≥ answer is ✓ and every cap < answer is ✗', () => {
    const r = prng(11)
    for (let c = 0; c < 200; c++) {
      const arr = Array.from({ length: ri(r, 1, 8) }, () => ri(r, 1, 25))
      const k = ri(r, 1, arr.length + 1)
      const { result, steps } = solve('bs-answer', { arr, k })
      expect(result.answer, `${arr} k=${k}`).toBe(brute(arr, k))
      for (const t of result.tried as string[]) {
        const cap = parseInt(t)
        expect(t.endsWith('✓')).toBe(cap >= result.answer)
      }
      const last = fv(steps[steps.length - 1]!)
      expect(last.scalars!.find((s) => s.id === 'lo')!.value).toBe(brute(arr, k))
      expect(last.result).toEqual([brute(arr, k)])
    }
  })
  it('counterexample: with lo = 0 the same search returns 0 for a=[10,1], k=3 (cap < max(a) is misjudged feasible); the product returns 10', () => {
    const greedy = (a: number[], cap: number) => {
      let cnt = 1, cur = 0
      for (const x of a) {
        if (cur + x > cap) { cnt++; cur = x } else cur += x
      }
      return cnt
    }
    expect(greedy([10, 1], 0)).toBe(3) // "feasible" for k = 3 although 10 > 0
    let lo = 0, hi = 11 // BUG: lo should be max(a)
    while (lo < hi) {
      const mid = lo + ((hi - lo) >> 1)
      if (greedy([10, 1], mid) <= 3) hi = mid
      else lo = mid + 1
    }
    expect(lo).toBe(0)
    expect(solve('bs-answer', { arr: [10, 1], k: 3 }).result.answer).toBe(10)
  })
})

describe('mono-stack vs independent reference', () => {
  it('next-greater indices and largest rectangle equal O(n²) brute force; the scene row shows the same numbers', () => {
    const r = prng(13)
    for (let c = 0; c < 250; c++) {
      const a = Array.from({ length: ri(r, 1, 12) }, () => ri(r, 0, c % 3 === 0 ? 3 : 15))
      const { result, steps } = solve('mono-stack', { arr: a })
      const ng = a.map((x, i) => {
        for (let j = i + 1; j < a.length; j++) if (a[j]! > x) return j
        return -1
      })
      let best = 0
      for (let l = 0; l < a.length; l++) {
        let mn = Infinity
        for (let q = l; q < a.length; q++) {
          mn = Math.min(mn, a[q]!)
          best = Math.max(best, mn * (q - l + 1))
        }
      }
      expect(result.nextGreater, `${a}`).toEqual(ng)
      expect(result.best).toBe(best)
      // every popped frame of part 1 is consistent: the popped index's recorded answer is the current i and a[popped] < a[i]
      for (const s of steps) {
        const id = s.codeRefs?.[1]?.anchorId
        if (id === 'msPop') {
          const i = s.vars.i as number
          const t = s.vars.popped as number
          expect(a[t]! < a[i]!).toBe(true)
          expect(ng[t]).toBe(i)
        }
      }
      const gotNg = steps.map(fv).filter((v) => v.op === '下一个更大').pop()!.rows.find((x) => x.id === 'res')!.cells
      expect(gotNg).toEqual(ng)
    }
  })
  it('counterexample: without the sentinel pass h=[2,3,4] is never settled (area 0); product gives 6', () => {
    const h = [2, 3, 4]
    const st: number[] = []
    let best = 0
    for (let i = 0; i < h.length; i++) {
      while (st.length && h[st[st.length - 1]!]! >= h[i]!) {
        const t = st.pop()!
        best = Math.max(best, h[t]! * (i - (st.length ? st[st.length - 1]! + 1 : 0)))
      }
      st.push(i)
    }
    expect(best).toBe(0)
    expect(solve('mono-stack', { arr: h }).result.best).toBe(6)
  })
})

describe('mono-queue vs independent reference', () => {
  it('window maxima/minima equal brute force; deque invariant (values strictly decrease front→back) holds in every frame', () => {
    const r = prng(17)
    for (let c = 0; c < 200; c++) {
      const a = Array.from({ length: ri(r, 1, 12) }, () => ri(r, -9, 9))
      const k = ri(r, 1, a.length)
      const { result, steps } = solve('mono-queue', { arr: a, k })
      const mx: number[] = []
      const mn: number[] = []
      for (let i = 0; i + k <= a.length; i++) {
        mx.push(Math.max(...a.slice(i, i + k)))
        mn.push(Math.min(...a.slice(i, i + k)))
      }
      expect(result.max, `${a} k=${k}`).toEqual(mx)
      expect(result.min).toEqual(mn)
      for (const s of steps) {
        const dv = fv(s).rows.find((x) => x.id === 'dv')!.cells.filter((x) => typeof x === 'number') as number[]
        for (let i = 1; i < dv.length; i++) expect(dv[i - 1]! > dv[i]!).toBe(true)
        const dq = fv(s).rows.find((x) => x.id === 'dq')!.cells.filter((x) => typeof x === 'number') as number[]
        expect(dq.length).toBeLessThanOrEqual(k + 1)
      }
    }
  })
  it('counterexample: expiry test "front < i − k" (off by one) outputs [5,5] for a=[5,1,1], k=2; product gives [5,1]', () => {
    const a = [5, 1, 1]
    const k = 2
    const dq: number[] = []
    const out: number[] = []
    for (let i = 0; i < a.length; i++) {
      while (dq.length && a[dq[dq.length - 1]!]! <= a[i]!) dq.pop()
      dq.push(i)
      if (dq[0]! < i - k) dq.shift() // BUG
      if (i >= k - 1) out.push(a[dq[0]!]!)
    }
    expect(out).toEqual([5, 5])
    expect(solve('mono-queue', { arr: a, k }).result.max).toEqual([5, 1])
  })
})
