import type { FamSpec } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, pairs, row } from './famCommon'

const DOC = 'lca.ts'
export const spec: FamSpec = {
  id: 'lca',
  meta: {
    id: 'lca',
    title: '最近公共祖先（倍增）',
    complexity: '预处理 O(n log n)，每次询问 O(log n)',
    description: 'up[j][v] 记录 v 的 2^j 级祖先；先把两点抬到同一深度，再从高位到低位一起向上跳。',
    implName: 'binaryLiftingLca',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'lca',
  fields: [
    { key: 'par', label: '父结点 par[1..n−1]（par[v] < v；结点 0 为根；至多 8 个）', kind: 'ints', minLen: 0, maxLen: 8, min: 0 },
    { key: 'queries', label: '询问（u v 两个一组，至多 4 组）', kind: 'ints', minLen: 2, maxLen: 8, min: 0 },
  ],
  defaultDraft: { par: '0 0 1 1 2 2 4', queries: '3 6, 5 7, 3 4, 7 7' },
  readyText: '尚未建表、尚未回答询问。',
  check: (i) => {
    const par = ints(i, 'par')
    const bad = par.findIndex((p, k) => p > k)
    if (bad >= 0) return { field: 'par', reason: `par[${bad + 1}] = ${par[bad]} 必须小于 ${bad + 1}（父编号小于子编号）` }
    const q = ints(i, 'queries')
    if (q.length % 2) return { field: 'queries', reason: '询问须 2 个一组（u v）' }
    const n = par.length + 1
    const over = q.find((x) => x >= n)
    if (over !== undefined) return { field: 'queries', reason: `结点 ${over} 超出 0..${n - 1}` }
    return null
  },
  generate(i) {
    const par = ints(i, 'par')
    const Q = pairs(ints(i, 'queries'))
    const n = par.length + 1
    let LOG = 1
    while (1 << LOG < n) LOG++
    const rec = new Recorder(DOC)
    const depth: (number | string)[] = new Array<number | string>(n).fill('?')
    depth[0] = 0
    const up: (number | string)[][] = Array.from({ length: LOG }, () => new Array<number | string>(n).fill('?'))
    const gv = (marks: Record<number, FamMark> = {}, edgeMarks: Record<string, FamMark> = {}) => ({
      n,
      edges: par.map((p, k) => [p, k + 1] as [number, number]),
      directed: false,
      layout: 'tree' as const,
      depth: (() => {
        const d = new Array<number>(n).fill(0)
        for (let v = 1; v < n; v++) d[v] = d[par[v - 1]!]! + 1
        return d
      })(),
      marks,
      edgeMarks,
    })
    const rows = (m: Record<string, Record<number, FamMark>> = {}) => [
      row('depth', 'depth[v]', depth, m.depth),
      ...up.map((r, j) => row(`up${j}`, `up[${j}][v]（2^${j} 级祖先）`, r, m[`up${j}`])),
    ]
    rec.push(`${n} 个结点（0 为根），${Q.length} 次询问。先预处理 depth 与 up 表，再回答询问。`, fam('初始', rows(), { graph: gv() }), [], { n, LOG })
    const D = new Array<number>(n).fill(0)
    for (let v = 1; v < n; v++) {
      D[v] = D[par[v - 1]!]! + 1
      depth[v] = D[v]!
      rec.push(`depth[${v}] = depth[${par[v - 1]}] + 1 = ${D[v]}。`, fam('深度', rows({ depth: { [v]: 'cur' } }), { graph: gv({ [v]: 'cur', [par[v - 1]!]: 'done' }) }), ['lcaDepth'], { v, depth: D[v]! })
    }
    for (let v = 0; v < n; v++) up[0]![v] = v === 0 ? 0 : par[v - 1]!
    rec.push('up[0][v] = 父结点（根的父结点记为自己，向上走到根就停在根）。', fam('第 0 层', rows(), { graph: gv() }), ['lcaBase'], { level: 0 })
    for (let j = 1; j < LOG; j++) {
      for (let v = 0; v < n; v++) up[j]![v] = up[j - 1]![up[j - 1]![v] as number] as number
      rec.push(`up[${j}][v] = up[${j - 1}][ up[${j - 1}][v] ]：2^${j} 级祖先 = 连走两次 2^${j - 1} 级。`, fam(`第 ${j} 层`, rows(), { graph: gv() }), ['lcaTable'], { level: j })
    }
    const answers: number[] = []
    Q.forEach(([a, b], qi) => {
      let u = a
      let v = b
      if (D[u]! < D[v]!) [u, v] = [v, u]
      const diff = D[u]! - D[v]!
      const sc = (): [string, string, number][] => [
        ['q', '询问', qi + 1],
        ['u', 'u', u],
        ['v', 'v', v],
      ]
      const hl = (extra: Record<string, Record<number, FamMark>> = {}) => ({ depth: { [u]: 'cur' as FamMark, [v]: 'pivot' as FamMark }, ...extra })
      const graphAt = (m: Record<number, FamMark> = {}) => gv({ [u]: 'cur', [v]: 'pivot', ...m })
      if (diff === 0) rec.push(`询问 ${qi + 1}：(${a}, ${b})，两点同深（${D[u]}），不需要抬升。`, fam('抬升', rows(hl()), { graph: graphAt(), scalars: sc() }), ['lcaLift'], { u, v, diff })
      for (let j = 0; j < LOG; j++) {
        if ((diff >> j) & 1) {
          const from = u
          u = up[j]![u] as number
          rec.push(`询问 ${qi + 1}：(${a}, ${b})，深度差 ${diff} 的第 ${j} 位为 1：u 从 ${from} 走 2^${j} 步到 ${u}。`, fam('抬升', rows(hl({ [`up${j}`]: { [from]: 'range' } })), { graph: graphAt(), scalars: sc() }), ['lcaLift'], { u, v, j })
        }
      }
      if (u !== v) {
        for (let j = LOG - 1; j >= 0; j--) {
          const pu = up[j]![u] as number
          const pv = up[j]![v] as number
          if (pu !== pv) {
            rec.push(`j = ${j}：up[${j}][${u}] = ${pu} ≠ up[${j}][${v}] = ${pv}：两点一起跳到 (${pu}, ${pv})。`, fam('一起跳', rows(hl({ [`up${j}`]: { [u]: 'cur', [v]: 'pivot' } })), { graph: graphAt(), scalars: sc() }), ['lcaJump'], { j, u, v })
            u = pu
            v = pv
          } else {
            rec.push(`j = ${j}：up[${j}][${u}] = up[${j}][${v}] = ${pu}：跳过头了（可能越过 LCA），不跳。`, fam('一起跳', rows(hl({ [`up${j}`]: { [u]: 'warn', [v]: 'warn' } })), { graph: graphAt(), scalars: sc() }), ['lcaJump'], { j, u, v })
          }
        }
        u = up[0]![u] as number
        rec.push(`u ≠ v 但它们的父结点相同：LCA = 父结点 = ${u}。`, fam('取父', rows(), { graph: gv({ [u]: 'hit' }), scalars: sc() }), ['lcaParent'], { lca: u })
      }
      answers.push(u)
      rec.push(`询问 ${qi + 1} 的答案：lca(${a}, ${b}) = ${u}。`, fam('答案', rows(), { graph: gv({ [u]: 'hit', [a]: 'cur', [b]: 'pivot' }), scalars: [['q', '询问', qi + 1], ['ans', '答案', u]], result: answers.slice() }), ['lcaAnswer'], { q: qi + 1, lca: u })
    })
    const result = { answers }
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
    return { steps: rec.steps, result }
  },
}
