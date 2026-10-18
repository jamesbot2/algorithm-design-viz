import type { FamSpec } from './famTypes'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'

const DOC = 'discretize.ts'
const lb = (u: number[], x: number) => {
  let lo = 0
  let hi = u.length
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1)
    if (u[mid]! < x) lo = mid + 1
    else hi = mid
  }
  return lo
}
export const spec: FamSpec = {
  id: 'discretize',
  meta: {
    id: 'discretize',
    title: '离散化（坐标压缩）',
    complexity: '排序 O(n log n)，去重 O(n)，每次名次 O(log n)',
    description: '排序 → 去重 → 每个值的名次 = 它在去重数组里的下标（lower_bound）。',
    implName: 'coordinateCompression',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'discretize',
  fields: [
    { key: 'arr', label: '数组 a（逗号分隔，长度 1..12）', kind: 'ints', minLen: 1, maxLen: 12 },
    { key: 'qs', label: '查询值 x（至多 6 个）：比 x 小的不同取值有几个', kind: 'ints', maxLen: 6 },
  ],
  defaultDraft: { arr: '90, 15, 90, -7, 15, 1000, 42', qs: '15, 16, -100, 2000' },
  readyText: '尚未排序、去重或编号。',
  generate(i) {
    const a = ints(i, 'arr')
    const qs = ints(i, 'qs')
    const rec = new Recorder(DOC)
    const s = new Array<number | null>(a.length).fill(null)
    let u: (number | null)[] = []
    const r = new Array<number | null>(a.length).fill(null)
    const qr = new Array<number | null>(qs.length).fill(null)
    const rows = (m: { a?: Record<number, any>; s?: Record<number, any>; u?: Record<number, any>; r?: Record<number, any>; q?: Record<number, any> } = {}) => [
      row('a', 'a[i]', a, m.a),
      row('s', '排序后', s, m.s),
      row('u', '去重 u[j]', u.length ? u : [null], m.u),
      row('r', '名次 rank[i]', r, m.r),
      ...(qs.length ? [row('q', '查询 x', qs, m.q), row('qr', '比 x 小的不同值', qr, m.q)] : []),
    ]
    rec.push(`a = [${a.join(', ')}]。目标：把数值换成 0..m−1 的名次，保持大小关系。`, fam('初始', rows()), [], { n: a.length })
    const sorted = [...a].sort((x, y) => x - y)
    sorted.forEach((v, k) => (s[k] = v))
    rec.push('复制并升序排序。', fam('排序', rows({ s: Object.fromEntries(sorted.map((_, k) => [k, 'done'])) })), ['sortCopy'], { n: a.length })
    const uu: number[] = []
    sorted.forEach((v, k) => {
      const keep = uu.length === 0 || uu[uu.length - 1] !== v
      if (keep) {
        uu.push(v)
        u = [...uu]
      }
      rec.push(keep ? `s[${k}] = ${v} 与上一个保留值不同 → 放入 u[${uu.length - 1}]。` : `s[${k}] = ${v} 与上一个保留值相同 → 跳过（重复）。`, fam('去重', rows({ s: { [k]: keep ? 'hit' : 'warn' }, u: keep ? { [uu.length - 1]: 'hit' } : {} })), ['dedupKeep'], { k, keep, size: uu.length })
    })
    const uf = [...uu]
    a.forEach((v, k) => {
      const idx = lb(uf, v)
      r[k] = idx
      rec.push(`rank[${k}] = lower_bound(u, ${v}) = ${idx}（u[${idx}] = ${uf[idx]}）。`, fam('编号', rows({ a: { [k]: 'cur' }, u: { [idx]: 'pivot' }, r: { [k]: 'hit' } })), ['rankCall', 'lbReturn'], { k, v, idx })
    })
    qs.forEach((x, k) => {
      const idx = lb(uf, x)
      qr[k] = idx
      rec.push(`查询 x=${x}：lower_bound(u, ${x}) = ${idx}，所以比 ${x} 小的不同取值有 ${idx} 个${uf[idx] === x ? `（${x} 本身在 u[${idx}]）` : `（${x} 不在 u 中）`}。`, fam(`query(${x})`, rows({ q: { [k]: 'cur' }, u: idx < uf.length ? { [idx]: 'pivot' } : {} })), ['queryCall', 'lbReturn'], { k, x, idx })
    })
    const result = { unique: uf, ranks: r as number[], queryRanks: qr as number[] }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
