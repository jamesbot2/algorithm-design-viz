import type { FamSpec } from './famTypes'
import { Recorder } from './common'
import { fam, ints, pairs, row, triples } from './famCommon'

const DOC = 'prefix_diff.ts'
export const spec: FamSpec = {
  id: 'prefix-diff',
  meta: {
    id: 'prefix-diff',
    title: '前缀和与差分',
    complexity: '预处理 O(n)，单次区间和 O(1)；q 次区间加 O(q + n)',
    description: '前缀和 p[i+1] = p[i] + a[i]，区间和 = p[r] − p[l]；差分 d[l] += v、d[r] −= v，最后做一次前缀和还原。',
    implName: 'prefixSumsAndDifference',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'prefix_diff',
  fields: [
    { key: 'arr', label: '数组 a（逗号分隔，长度 1..12）', kind: 'ints', minLen: 1, maxLen: 12 },
    { key: 'ups', label: '区间加（l r v 三个一组，半开 [l,r)，至多 4 组）', kind: 'ints', maxLen: 12 },
    { key: 'qs', label: '区间和查询（l r 两个一组，半开 [l,r)，至多 5 组）', kind: 'ints', maxLen: 10 },
  ],
  defaultDraft: { arr: '3, 1, 4, 1, 5, 9, 2, 6', ups: '1 5 10, 4 8 -3', qs: '0 8, 2 6, 5 5' },
  readyText: '尚未计算前缀和或差分。',
  check: (i) => {
    const n = ints(i, 'arr').length
    if (ints(i, 'ups').length % 3) return { field: 'ups', reason: '区间加须 3 个一组（l r v）' }
    if (ints(i, 'qs').length % 2) return { field: 'qs', reason: '查询须 2 个一组（l r）' }
    for (const [l, r] of [...triples(ints(i, 'ups')).map(([l, r]) => [l, r] as const), ...pairs(ints(i, 'qs'))]) if (l < 0 || r > n || l > r) return { field: 'ups', reason: `区间 [${l},${r}) 须满足 0 ≤ l ≤ r ≤ ${n}` }
    return null
  },
  generate(i) {
    const a = ints(i, 'arr')
    const n = a.length
    const rec = new Recorder(DOC)
    const p = new Array<number | null>(n + 1).fill(null)
    const d = new Array<number>(n + 1).fill(0)
    const out = new Array<number | null>(n).fill(null)
    const rows = (marks: { a?: Record<number, any>; p?: Record<number, any>; d?: Record<number, any>; o?: Record<number, any> } = {}) => [
      row('a', 'a[i]', a, marks.a),
      row('p', 'p[i]（前 i 项和）', p, marks.p),
      row('d', 'd[i]（差分）', d, marks.d),
      row('out', '还原 a′[i]', out, marks.o),
    ]
    rec.push(`a = [${a.join(', ')}]。先建前缀和 p（p[0] = 0），再用差分数组处理区间加。`, fam('初始', rows()), [], { n })
    p[0] = 0
    rec.push('p[0] = 0：空前缀的和。', fam('前缀和', rows({ p: { 0: 'cur' } })), ['prefixInit'], { n })
    for (let k = 0; k < n; k++) {
      p[k + 1] = (p[k] as number) + a[k]!
      rec.push(`p[${k + 1}] = p[${k}] + a[${k}] = ${p[k]} + ${a[k]} = ${p[k + 1]}。`, fam('前缀和', rows({ a: { [k]: 'range' }, p: { [k + 1]: 'cur' } })), ['prefixStep'], { i: k, value: p[k + 1] as number })
    }
    const answers: number[] = []
    for (const [l, r] of pairs(ints(i, 'qs'))) {
      const v = (p[r] as number) - (p[l] as number)
      answers.push(v)
      const rg: Record<number, 'range'> = {}
      for (let t = l; t < r; t++) rg[t] = 'range'
      rec.push(`sum[${l},${r}) = p[${r}] − p[${l}] = ${p[r]} − ${p[l]} = ${v}。`, fam(`sum(${l}, ${r})`, rows({ a: rg, p: { [l]: 'pivot', [r]: 'pivot' } })), ['rangeSumRet'], { l, r, result: v })
    }
    for (const [l, r, v] of triples(ints(i, 'ups'))) {
      d[l]! += v
      rec.push(`add(${l}, ${r}, ${v})：d[${l}] += ${v} → ${d[l]}。`, fam(`add(${l}, ${r}, ${v})`, rows({ d: { [l]: 'cur' } })), ['diffL'], { l, r, v })
      d[r]! -= v
      rec.push(`d[${r}] −= ${v} → ${d[r]}（区间结束处抵消）。`, fam(`add(${l}, ${r}, ${v})`, rows({ d: { [l]: 'done', [r]: 'cur' } })), ['diffR'], { l, r, v })
    }
    let run = 0
    for (let k = 0; k < n; k++) {
      run += d[k]!
      rec.push(`还原：run += d[${k}] → ${run}。`, fam('还原', rows({ d: { [k]: 'cur' }, o: {} }), { scalars: [['run', 'run', run]] }), ['restoreRun'], { i: k, run })
      out[k] = a[k]! + run
      rec.push(`a′[${k}] = a[${k}] + run = ${a[k]} + ${run} = ${out[k]}。`, fam('还原', rows({ a: { [k]: 'range' }, o: { [k]: 'hit' } }), { scalars: [['run', 'run', run]] }), ['restoreOut'], { i: k, value: out[k] as number })
    }
    const result = { prefix: p as number[], answers, final: out as number[] }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
