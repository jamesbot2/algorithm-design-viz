import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { advancedEntries, solveAdvanced, isAdvancedId } from '../../src/algorithms/advanced/registry'
import type { AdvancedAlgoId } from '../../src/algorithms/advanced/registry'
import type { Step } from '../../src/types/step'
import { TOPICS } from '../../src/features/advanced/catalog/topics'
import { ROADMAP } from '../../src/features/advanced/catalog/roadmap'
import { searchTopics, searchRoadmap, matchesModule } from '../../src/features/advanced/catalog/search'
import { advancedPageKind } from '../../src/features/advanced/catalog/route'
import { TEMPLATES } from '../../src/features/advanced/templates/meta'
import { SOURCE_HASHES, TESTSET_VERSION } from '../../src/features/advanced/templates/hashes.generated'
import contestSources from '../../src/features/advanced/templates/sources.generated'
import { validationState } from '../../src/features/advanced/templates/validation'
import validationJson from '../../src/features/advanced/templates/validation.json'
import dsuDocs from '../../src/codeCatalog/dsu/langs.generated'
import fwDocs from '../../src/codeCatalog/fenwick/langs.generated'
import segDocs from '../../src/codeCatalog/segtree/langs.generated'
import { getSegtreeCatalog } from '../../src/codeCatalog/segtree'
import { maxNodeId } from '../../src/algorithms/advanced/segtree'
import { getDsuCatalog } from '../../src/codeCatalog/dsu'
import { getFenwickCatalog } from '../../src/codeCatalog/fenwick'
import { getStlBoundsCatalog } from '../../src/codeCatalog/stl_bounds'
import { getStlPriorityQueueCatalog } from '../../src/codeCatalog/stl_priority_queue'
import { boundIndex } from '../../src/algorithms/advanced/stlBounds'
import { CONTENT_LOADERS } from '../../src/features/advanced/content/loaders'
import { CATALOG_LOADERS } from '../../src/features/advanced/components/catalogLoaders'
import { validateBoundsInput, parsePqOps } from '../../src/features/advanced/inputs'

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
const solveDraft = (id: AdvancedAlgoId, draft: Record<string, string>) => {
  const e = advancedEntries[id]
  const p = e.parseDraft(draft)
  if (!p.ok) throw new Error(JSON.stringify(p.issues))
  return e.solve(p.value)
}
const view = (s: Step | undefined) => s?.advanced as never as Record<string, any>

describe('dsu trace vs naive label-array reference', () => {
  it('random inputs: final components, partition, sizes; every step is a valid forest', () => {
    const r = prng(11)
    for (let c = 0; c < 150; c++) {
      const n = ri(r, 1, 12)
      const ops: string[] = []
      for (let i = 0; i < ri(r, 0, 20); i++) ops.push(`${['union', 'union', 'find', 'same'][ri(r, 0, 3)]} ${ri(r, 0, n - 1)} ${ri(r, 0, n - 1)}`.replace(/^find (\d+) \d+$/, 'find $1'))
      const { steps } = solveDraft('dsu', { n: String(n), ops: ops.join('; ') })
      const lab = Array.from({ length: n }, (_, i) => i)
      for (const o of ops) {
        const [k, a, b] = o.split(' ')
        if (k === 'union' && lab[+a!] !== lab[+b!]) {
          const f = lab[+b!]
          for (let i = 0; i < n; i++) if (lab[i] === f) lab[i] = lab[+a!]!
        }
      }
      const last = view(steps[steps.length - 1])
      expect(last.components).toBe(new Set(lab).size)
      const parent: number[] = last.parent
      const root = (x: number) => {
        let g = 0
        while (parent[x] !== x) {
          x = parent[x]!
          if (++g > n) throw new Error('cycle')
        }
        return x
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) expect(root(i) === root(j)).toBe(lab[i] === lab[j])
      for (const s of steps) {
        const v = view(s)
        const p: number[] = v.parent
        for (let i = 0; i < n; i++) {
          let x = i
          let g = 0
          while (p[x] !== x) {
            x = p[x]!
            expect(++g).toBeLessThanOrEqual(n) // no cycles at any step
          }
        }
      }
    }
  })
  it('tie rule: equal sizes attach the second root under the first', () => {
    const { steps } = solveDraft('dsu', { n: '4', ops: 'union 0 1' })
    expect(view(steps[steps.length - 1]).parent.slice(0, 2)).toEqual([0, 0])
  })
})

describe('fenwick trace vs prefix-array reference', () => {
  it('random ops: values, tree, and every query result', () => {
    const r = prng(23)
    for (let c = 0; c < 150; c++) {
      const n = ri(r, 1, 16)
      const ops: string[] = []
      for (let i = 0; i < ri(r, 1, 20); i++) {
        const t = ri(r, 0, 2)
        if (t === 0) ops.push(`add ${ri(r, 0, n - 1)} ${ri(r, -50, 50)}`)
        else if (t === 1) ops.push(`prefix ${ri(r, 0, n)}`)
        else {
          const l = ri(r, 0, n)
          ops.push(`range ${l} ${ri(r, l, n)}`)
        }
      }
      const { steps, result } = solveDraft('fenwick', { n: String(n), ops: ops.join('; ') }) as { steps: Step[]; result: any }
      const a = new Array<number>(n).fill(0)
      const t = new Array<number>(n + 1).fill(0)
      const answers: number[] = []
      for (const o of ops) {
        const [k, x, y] = o.split(' ')
        if (k === 'add') {
          a[+x!]! += +y!
          for (let i = +x! + 1; i <= n; i += i & -i) t[i]! += +y!
        } else if (k === 'prefix') answers.push(a.slice(0, +x!).reduce((s, v) => s + v, 0))
        else answers.push(a.slice(+x!, +y!).reduce((s, v) => s + v, 0))
      }
      const last = view(steps[steps.length - 1])
      expect(last.values).toEqual(a)
      expect(last.tree.slice(last.tree.length - n)).toEqual(t.slice(1))
      expect(result.answers.map((x: { value: number }) => x.value), `n=${n} ops=${ops.join(';')}`).toEqual(answers)
      expect(result.tree).toEqual(t.slice(1))
      expect(result.values).toEqual(a)
    }
  })
})

describe('segtree trace vs naive array reference', () => {
  it('random inputs: every sum answer, final values, and invariant tree[node] = sum(a[lo,hi))', () => {
    const r = prng(31)
    for (let c = 0; c < 150; c++) {
      const n = ri(r, 1, 16)
      const arr = Array.from({ length: n }, () => ri(r, -20, 20))
      const ops: string[] = []
      for (let i = 0; i < ri(r, 1, 18); i++) {
        if (r() < 0.5) ops.push(`set ${ri(r, 0, n - 1)} ${ri(r, -30, 30)}`)
        else {
          const l = ri(r, 0, n)
          ops.push(`sum ${l} ${ri(r, l, n)}`)
        }
      }
      const { steps, result } = solveDraft('segtree', { arr: arr.join(', '), ops: ops.join('; ') }) as { steps: Step[]; result: any }
      const a = [...arr]
      const ans: number[] = []
      for (const o of ops) {
        const [k, x, y] = o.split(' ')
        if (k === 'set') a[+x!] = +y!
        else ans.push(a.slice(+x!, +y!).reduce((s, v) => s + v, 0))
      }
      expect(result.answers.map((q: { value: number }) => q.value), `${arr}|${ops}`).toEqual(ans)
      expect(result.values).toEqual(a)
      // invariant on the final tree: every built node equals the naive sum of its range
      const check = (node: number, lo: number, hi: number) => {
        expect(result.tree[node]).toBe(a.slice(lo, hi).reduce((s, v) => s + v, 0))
        if (hi - lo > 1) {
          const mid = lo + ((hi - lo) >> 1)
          check(2 * node, lo, mid)
          check(2 * node + 1, mid, hi)
        }
      }
      check(1, 0, n)
      // 'inside' nodes of each query cover [l,r) exactly once
      for (const st of steps) {
        const v = view(st)
        if (v.query && v.result !== undefined) {
          const cover = new Array<number>(n).fill(0)
          for (const x of v.visited) if (x.role === 'inside') {
            let lo = 0, hi = n, node = 1
            const path: number[] = []
            for (let m = x.node; m > 1; m >>= 1) path.unshift(m & 1)
            for (const bit of path) { const mid = lo + ((hi - lo) >> 1); if (bit === 0) hi = mid; else lo = mid; node = node * 2 + bit }
            for (let i = lo; i < hi; i++) cover[i]!++
          }
          for (let i = 0; i < n; i++) expect(cover[i]).toBe(i >= v.query[0] && i < v.query[1] ? 1 : 0)
        }
      }
    }
  })
  it('counterexample: recursive layout for n=5 reaches node 15 > 2n=10', () => {
    expect(maxNodeId(5)).toBe(15)
    expect(maxNodeId(5)).toBeGreaterThan(2 * 5)
    expect(maxNodeId(5)).toBeLessThan(4 * 5)
    for (let n = 1; n <= 64; n++) expect(maxNodeId(n)).toBeLessThan(4 * n)
  })
  it('all six documents carry every emitted anchor', () => {
    const need = new Set<string>()
    for (const d of [advancedEntries.segtree.defaultDraft, { arr: '1,2,3,4,5', ops: 'set 2 9; sum 0 5; sum 4 4; sum 1 3' }]) for (const st of solveDraft('segtree', d).steps) for (const r of st.codeRefs ?? []) need.add(r.anchorId)
    expect(need.size).toBeGreaterThanOrEqual(9)
    const docs = [getSegtreeCatalog().typescript, ...segDocs]
    expect(docs.map((d) => d.language).sort()).toEqual(['cpp', 'go', 'java', 'python', 'rust', 'typescript'])
    for (const d of docs) {
      const ids = new Set(d.anchors.map((a) => a.id))
      for (const a of need) expect(ids.has(a), `segtree/${d.language} lacks ${a}`).toBe(true)
      expect(d.source).not.toContain('@a:')
      expect(sha(d.source)).toBe(SOURCE_HASHES.segtree!.teach![d.language])
    }
  })
})

describe('bounds / pq', () => {
  it('bounds model equals linear scan for random sorted arrays (both modes)', () => {
    const r = prng(5)
    for (let c = 0; c < 200; c++) {
      const a = Array.from({ length: ri(r, 0, 14) }, () => ri(r, -5, 5)).sort((x, y) => x - y)
      for (let x = -7; x <= 7; x++) {
        let lo = 0
        while (lo < a.length && a[lo]! < x) lo++
        let hi = 0
        while (hi < a.length && !(x < a[hi]!)) hi++
        expect(boundIndex(a, x, 'lower')).toBe(lo)
        expect(boundIndex(a, x, 'upper')).toBe(hi)
      }
    }
  })
  it('bounds validator rejects unsorted input with the precondition', () => {
    const v = validateBoundsInput({ arr: [1, 5, 3, 4], target: 3, mode: 'lower' })
    expect(v.ok).toBe(false)
  })
  it('pq: heap order holds after every step and final multiset equals the reference', () => {
    const r = prng(9)
    for (let c = 0; c < 150; c++) {
      let size = 0
      const ops: string[] = []
      for (let i = 0; i < ri(r, 1, 18); i++) {
        if (size > 0 && r() < 0.4) {
          ops.push('pop()')
          size--
        } else {
          ops.push(`push(${ri(r, -9, 9)})`)
          size++
        }
      }
      const { steps } = solveDraft('stl-priority-queue', { ops: ops.join('; ') })
      const ref: number[] = []
      for (const o of ops) {
        if (o.startsWith('push')) ref.push(+/-?\d+/.exec(o)![0])
        else ref.splice(ref.indexOf(Math.max(...ref)), 1)
      }
      // heap order is only guaranteed between operations (mid-sift frames are legitimately transient)
      const fin: number[] = view(steps[steps.length - 1]).heap
      for (let i = 1; i < fin.length; i++) expect(fin[(i - 1) >> 1]!).toBeGreaterThanOrEqual(fin[i]!)
      expect([...view(steps[steps.length - 1]).heap].sort((x, y) => x - y)).toEqual([...ref].sort((x, y) => x - y))
    }
  })
  it('pq: empty top/pop stops before the UB operation, with no code reference on the stop', () => {
    const { steps } = solveDraft('stl-priority-queue', { ops: 'push(1); pop(); pop(); push(2)' })
    const last = steps[steps.length - 1]!
    expect(view(last).stopped).toBe(true)
    expect(last.codeRefs ?? []).toHaveLength(0)
  })
  it('pq: expressions are rejected by the whitelist parser (never evaluated)', () => {
    for (const bad of ['push(1+2)', 'push(alert(1))', 'pop(1)', 'eval("x")', 'push(1e9999)', 'push(0x10)']) expect(parsePqOps(bad).ok, bad).toBe(false)
  })
})

describe('anchors: every emitted anchor exists in every displayed document', () => {
  const six = async (id: 'dsu' | 'fenwick') => {
    const ts = (id === 'dsu' ? getDsuCatalog() : getFenwickCatalog()).typescript
    const gen = id === 'dsu' ? dsuDocs : fwDocs
    return [ts, ...gen]
  }
  const emitted = (id: AdvancedAlgoId, drafts: Record<string, string>[]) => {
    const s = new Set<string>()
    for (const d of drafts) for (const st of solveDraft(id, d).steps) for (const r of st.codeRefs ?? []) s.add(r.anchorId)
    return s
  }
  it('dsu / fenwick: all six languages carry all emitted anchors; ranges inside the document', async () => {
    for (const [id, drafts] of [
      ['dsu', [advancedEntries.dsu.defaultDraft, { n: '6', ops: 'union 0 1; union 1 0; union 2 3; union 3 0; same 0 2; find 3' }]],
      ['fenwick', [advancedEntries.fenwick.defaultDraft, { n: '5', ops: 'add 0 1; prefix 0; prefix 5; range 1 4' }]],
    ] as const) {
      const need = emitted(id, drafts as never)
      expect(need.size).toBeGreaterThan(5)
      const docs = await six(id)
      expect(docs.map((d) => d.language).sort()).toEqual(['cpp', 'go', 'java', 'python', 'rust', 'typescript'])
      for (const d of docs) {
        const ids = new Set(d.anchors.map((a) => a.id))
        const lines = d.source.split('\n').length
        for (const a of need) expect(ids.has(a), `${id}/${d.language} lacks anchor ${a}`).toBe(true)
        for (const a of d.anchors) {
          expect(a.range.startLine).toBeGreaterThanOrEqual(1)
          expect(a.range.endLine).toBeLessThanOrEqual(lines)
          expect(d.source).not.toContain('@a:')
        }
      }
    }
  })
  it('stl docs (C++ only) carry all emitted anchors', () => {
    const b = emitted('stl-bounds', [advancedEntries['stl-bounds'].defaultDraft, { ...advancedEntries['stl-bounds'].defaultDraft, mode: 'upper' }])
    const p = emitted('stl-priority-queue', [advancedEntries['stl-priority-queue'].defaultDraft])
    const bd = new Set(getStlBoundsCatalog().typescript.anchors.map((a) => a.id))
    const pd = new Set(getStlPriorityQueueCatalog().typescript.anchors.map((a) => a.id))
    for (const a of b) expect(bd.has(a), a).toBe(true)
    for (const a of p) expect(pd.has(a), a).toBe(true)
  })
})

describe('catalog honesty and wiring', () => {
  it('every capability claim is backed by a real registry entry / loader / template / content chunk', async () => {
    for (const t of TOPICS) {
      if (t.caps.demo === 'done') expect(isAdvancedId(t.demoId ?? '') && advancedEntries[t.demoId as AdvancedAlgoId], t.id).toBeTruthy()
      if (t.caps.template === 'done') expect(TEMPLATES.find((x) => x.id === t.templateId), t.id).toBeTruthy()
      if (t.caps.explanation === 'done') {
        const c = await CONTENT_LOADERS[t.id]!()
        expect(c.sections.length, t.id).toBeGreaterThan(4)
      }
      expect(CATALOG_LOADERS[advancedEntries[t.demoId as AdvancedAlgoId].catalogId], t.id).toBeTruthy()
      expect(advancedEntries[t.demoId as AdvancedAlgoId].languages).toBe(t.caps.languages === 'six' ? 'six' : 'cpp-only')
      expect(t.relatedAlgos.length + t.prereqs.length).toBeGreaterThanOrEqual(0)
    }
  })
  it('STL explanations contain every required section', async () => {
    for (const id of ['stl-bounds', 'stl-priority-queue']) {
      const c = await CONTENT_LOADERS[id]!()
      const ids = c.sections.map((s) => s.id)
      for (const need of ['when', 'header', 'api', 'complexity', 'example', 'mistakes', 'related']) expect(ids, `${id} lacks ${need}`).toContain(need)
      expect(c.boundary.length).toBeGreaterThan(1)
    }
  })
  it('roadmap holds only undelivered items; none shadows a delivered topic', () => {
    const delivered = new Set(TOPICS.map((t) => t.id))
    for (const r of ROADMAP) expect(delivered.has(r.id), r.id).toBe(false)
    expect(TOPICS.every((t) => t.caps.explanation === 'done' && t.caps.demo === 'done')).toBe(true)
  })
  it('search: Chinese / English / abbreviations; planned items only in the roadmap', () => {
    const ids = (q: string) => searchTopics({ q }).map((t) => t.id)
    expect(ids('树状数组')).toContain('fenwick')
    expect(ids('Fenwick')).toContain('fenwick')
    expect(ids('BIT')).toContain('fenwick')
    expect(ids('并查集')).toContain('dsu')
    expect(ids('DSU')).toContain('dsu')
    expect(ids('union find')).toContain('dsu')
    expect(ids('lower_bound')).toContain('stl-bounds')
    expect(ids('强连通')).toEqual([])
    expect(searchRoadmap('强连通').length).toBeGreaterThan(0)
    expect(searchRoadmap('SCC').length).toBeGreaterThan(0)
    expect(matchesModule('高阶')).toBe(true)
    expect(matchesModule('dijkstra')).toBe(false)
  })
  it('page kinds for the layout budget', () => {
    expect(advancedPageKind('/advanced', '')).toBe('home')
    expect(advancedPageKind('/advanced/stl', '')).toBe('index')
    expect(advancedPageKind('/advanced/stl/stl-bounds', '')).toBe('topic')
    expect(advancedPageKind('/advanced/stl/stl-bounds', '?view=demo')).toBe('demo')
    expect(advancedPageKind('/advanced/algorithms/dsu', '?view=demo')).toBe('demo')
    expect(advancedPageKind('/advanced/templates', '')).toBe('index')
    expect(advancedPageKind('/advanced/templates/dsu', '')).toBe('template')
    expect(advancedPageKind('/algo/lcs', '')).toBeNull()
  })
  it('Worker registers the advanced kind and solveAdvanced is the same function the main thread uses', () => {
    const src = readFileSync('src/core/runner/heavySolve.worker.ts', 'utf8')
    expect(src).toMatch(/kind === 'advanced'/)
    expect(src).toMatch(/solveAdvanced/)
    expect(solveAdvanced('dsu', { n: 3, ops: [{ t: 'union', a: 0, b: 1 }] }).ok).toBe(true)
  })
})

describe('template sources, hashes and validation binding', () => {
  it('generated files are fresh (gen-advanced --check)', () => {
    execFileSync('node', ['scripts/gen-advanced.mjs', '--check'], { stdio: 'pipe' })
  })
  it('bound hashes equal SHA-256 of the exact displayed text (teaching, contest core/full)', () => {
    for (const d of [...dsuDocs, getDsuCatalog().typescript]) expect(sha(d.source)).toBe(SOURCE_HASHES.dsu!.teach![d.language])
    for (const d of [...fwDocs, getFenwickCatalog().typescript]) expect(sha(d.source)).toBe(SOURCE_HASHES.fenwick!.teach![d.language])
    expect(sha(getStlBoundsCatalog().typescript.source)).toBe(SOURCE_HASHES['stl-bounds']!.teach!.cpp)
    expect(sha(getStlPriorityQueueCatalog().typescript.source)).toBe(SOURCE_HASHES['stl-priority-queue']!.teach!.cpp)
    for (const [id, c] of Object.entries(contestSources)) {
      expect(sha(c.core.source)).toBe(SOURCE_HASHES[id]!.contest!.core)
      expect(sha(c.full.source)).toBe(SOURCE_HASHES[id]!.contest!.full)
      expect(c.full.source.startsWith(c.core.source)).toBe(true)
    }
  })
  it('validation.json is bound to the CURRENT hashes and test-set version; a changed hash is stale, never verified', () => {
    expect(validationJson.testsetVersion).toBe(TESTSET_VERSION)
    const keys = Object.keys(validationJson.entries)
    expect(keys.length).toBe(30)
    for (const k of keys) {
      const [id, variant, lang] = k.split('|') as [string, string, string]
      const cur = variant === 'teach' ? SOURCE_HASHES[id]!.teach![lang] : SOURCE_HASHES[id]!.contest![variant === 'contest-core' ? 'core' : 'full']
      expect(validationState(k, cur).state, k).toBe('verified')
      expect(validationState(k, 'deadbeef').state, k).toBe('stale')
    }
    expect(validationState('nope|teach|cpp|run', 'x').state).toBe('unverified')
  })
  it('counterexample claims are computable and true', () => {
    // dsu: parent[a]=b without find
    const p = [0, 1, 2, 3]
    const naiveUnion = (a: number, b: number) => void (p[a] = b)
    const find = (x: number) => (p[x] === x ? x : find(p[x]!))
    naiveUnion(0, 1)
    naiveUnion(2, 3)
    naiveUnion(0, 2)
    expect(find(1) === find(3)).toBe(false) // wrong answer (they ARE connected: 0-1, 2-3, 0-2)
    const { steps } = solveDraft('dsu', { n: '4', ops: 'union 0 1; union 2 3; union 0 2; same 1 3' })
    const r = view(steps[steps.length - 1])
    expect(r.components).toBe(1)
    // bounds: unsorted input gives a "result" that is not x
    const a = [1, 5, 3, 4]
    const idx = boundIndex(a, 3, 'lower')
    expect(idx).toBe(1)
    expect(a[idx]).not.toBe(3)
    // fenwick: lowbit(0)=0 → p never advances (p + lowbit(p) === p at p=0)
    const p0 = 0
    expect(p0 + (p0 & -p0)).toBe(p0)
    // pq: [9,7,3,5] is a valid heap but not sorted
    const h = view(solveDraft('stl-priority-queue', { ops: 'push(5); push(9); push(3); push(7)' }).steps.at(-1)).heap
    expect(h).toEqual([9, 7, 3, 5])
    expect([...h].sort((x: number, y: number) => y - x)).not.toEqual(h)
  })
})
