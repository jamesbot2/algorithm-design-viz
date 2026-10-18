import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, pairs, row } from './famCommon'
import { opLabel, stopText } from './labCommon'

const DOC = 'stl_comparator.cpp'
export const GRAMMAR: LabGrammar = {
  sortlex: { args: [] },
  grtr: { args: [] },
  sfirst: { args: [] },
  ssecd: { args: [] },
  rev: { args: [] },
  rbeg: { args: [] },
  minel: { args: [] },
  lbf: { args: ['i'], lo: -9, hi: 9 },
}
type P = [number, number]
export interface CmpResult {
  ok: boolean
  states: string[]
  final: P[]
  stoppedAt?: number
  reason?: string
}
interface Evt {
  msg: string
  anchors: string[]
  marks?: Record<number, FamMark>
  r?: string
  stop?: boolean
}
const lex = (a: P, b: P) => a[0] - b[0] || a[1] - b[1]
const fmt = (v: P[]) => v.map((p) => `${p[0]}:${p[1]}`)

/** sort_lex / grtr are total orders on pairs (equal pairs are indistinguishable) so the result is unique; stable_* are fully specified. */
export function simComparator(init: P[], ops: LabOp[], emit?: (e: Evt, v: P[]) => void): CmpResult {
  const v: P[] = init.map((p) => [...p] as P)
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, v)
  let k = 0
  let sortedFirst = false
  const stop = (label: string, why: string): CmpResult => {
    const reason = stopText(k, label, why)
    E({ msg: reason, anchors: [], stop: true })
    return { ok: false, states, final: v.map((p) => [...p] as P), stoppedAt: k, reason }
  }
  E({ msg: `初始 ${v.length} 个 pair（显示为 first:second）。`, anchors: [] })
  for (const op of ops) {
    k++
    const label = opLabel(op, GRAMMAR)
    let r = '-'
    const was = sortedFirst
    sortedFirst = false
    const all = (m: FamMark): Record<number, FamMark> => Object.fromEntries(v.map((_, i) => [i, m]))
    if (op.t === 'sortlex') {
      v.sort(lex)
      sortedFirst = true
      E({ msg: `${label}：默认 operator<：先比 first，相等再比 second。这是全序，结果唯一。`, anchors: ['cLex'], marks: all('done') })
    } else if (op.t === 'grtr') {
      v.sort((a, b) => lex(b, a))
      E({ msg: `${label}：std::greater<pair>：字典序降序，仍是严格弱序（全序）。`, anchors: ['cGreater'], marks: all('done') })
    } else if (op.t === 'sfirst') {
      const idx = v.map((p, i) => [p, i] as [P, number])
      idx.sort((a, b) => a[0][0] - b[0][0] || a[1] - b[1])
      v.splice(0, v.length, ...idx.map((x) => x[0]))
      sortedFirst = true
      E({ msg: `${label}：比较器 ByFirst 只看 first（a.first < b.first，严格 <）。stable_sort 保证 first 相同的 pair 保持原来的先后。`, anchors: ['cFirst', 'cStableFirst'], marks: all('done') })
    } else if (op.t === 'ssecd') {
      const idx = v.map((p, i) => [p, i] as [P, number])
      idx.sort((a, b) => b[0][1] - a[0][1] || a[1] - b[1])
      v.splice(0, v.length, ...idx.map((x) => x[0]))
      E({ msg: `${label}：比较器 BySecondDesc（a.second > b.second）；stable_sort 让 second 相同的保持原来的先后。`, anchors: ['cSecD', 'cStableSec'], marks: all('done') })
    } else if (op.t === 'rev') {
      v.reverse()
      E({ msg: `${label}：整体翻转。`, anchors: ['cRev'], marks: all('pivot') })
    } else if (op.t === 'rbeg') {
      const p = v[v.length - 1]!
      r = `${p[0]}:${p[1]}`
      E({ msg: `${label}：*v.rbegin() 就是最后一个元素 ${r}（反向迭代器从尾部开始）。`, anchors: ['cRbegin'], marks: { [v.length - 1]: 'hit' }, r })
    } else if (op.t === 'minel') {
      let b = 0
      for (let i = 1; i < v.length; i++) if (v[i]![0] < v[b]![0]) b = i
      r = String(b)
      E({ msg: `${label}：按 ByFirst 取最小，并列时 min_element 返回第一个：下标 ${b}。`, anchors: ['cMin', 'cFirst'], marks: { [b]: 'hit' }, r })
    } else {
      if (!was) return stop(label, 'lower_bound 要求区间已按 first 排好序（必须紧跟在 sortlex 或 sfirst 之后）')
      const x = op.n[0]!
      let lo = 0
      while (lo < v.length && v[lo]![0] < x) lo++
      r = String(lo)
      sortedFirst = true
      E({ msg: `${label}：第一个 first ≥ ${x} 的位置是 ${lo}${lo === v.length ? '（= end）' : ''}。`, anchors: ['cLb'], marks: lo < v.length ? { [lo]: 'hit' } : {}, r })
    }
    states.push(`r=${r} v=[${fmt(v).join(' ')}]`)
  }
  E({ msg: '全部操作完成。', anchors: [] })
  return { ok: true, states, final: v.map((p) => [...p] as P) }
}

export const spec: FamSpec = {
  id: 'stl-comparator',
  cppOnly: true,
  meta: {
    id: 'stl-comparator',
    title: '迭代器与比较器实验',
    complexity: 'sort / stable_sort O(n log n)；min_element O(n)；lower_bound O(log n)（要求有序）',
    description: '对 vector<pair<int,int>> 使用默认比较、自定义比较器、stable_sort、反向迭代器与 lower_bound，并说明严格弱序。',
    implName: 'comparatorModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_comparator',
  fields: [
    { key: 'arr', label: '成对的整数 a, b, a, b …（2..16 个数，共 1..8 个 pair）', kind: 'ints', minLen: 2, maxLen: 16, min: -9, max: 9 },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 12 },
  ],
  defaultDraft: { arr: '2, 5, 1, 5, 2, 3, 1, 9', ops: 'sfirst; ssecd; sortlex; rbeg; minel; lbf 2; grtr' },
  check: (i) => ((i.arr as number[]).length % 2 ? { field: 'arr', reason: '整数个数必须是偶数（每两个组成一个 pair）' } : null),
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const init = pairs(ints(i, 'arr'))
    const ops = i.ops as LabOp[]
    const rec = new Recorder(DOC)
    const res = simComparator(init, ops, (e, v) => {
      rec.push(e.msg, fam(e.stop ? '已停止' : 'pairs', [row('f', 'first', v.map((p) => p[0]), e.marks ?? {}), row('s', 'second', v.map((p) => p[1]), e.marks ?? {})], e.r !== undefined ? { scalars: [['r', '结果', e.r]] } : {}), e.anchors, {}, e.stop ? { phase: 'stopped' } : {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
