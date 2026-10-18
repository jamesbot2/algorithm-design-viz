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
