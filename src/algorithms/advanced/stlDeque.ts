import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'
import { opLabel, stopText } from './labCommon'

const DOC = 'stl_deque.cpp'
export const GRAMMAR: LabGrammar = {
  pushb: { args: ['i'] },
  pushf: { args: ['i'] },
  popb: { args: [] },
  popf: { args: [] },
  front: { args: [] },
  back: { args: [] },
}
export interface DeqResult {
  ok: boolean
  states: string[]
  final: number[]
  stoppedAt?: number
  reason?: string
}
interface Evt {
  msg: string
  anchors: string[]
  hot?: number
  stop?: boolean
}
interface St {
  slots: Map<number, number> // stable slot index -> value
  lo: number
  hi: number // occupied range [lo, hi]
}

/** Deque model with STABLE slots: an element keeps its slot for its whole life; only the ends grow / shrink. */
export function simDeque(init: number[], ops: LabOp[], emit?: (e: Evt, s: St) => void): DeqResult {
  const s: St = { slots: new Map(init.map((x, i) => [i, x])), lo: 0, hi: init.length - 1 }
  const states: string[] = []
  const list = () => (s.hi < s.lo ? [] : Array.from({ length: s.hi - s.lo + 1 }, (_, i) => s.slots.get(s.lo + i)!))
  const E = (e: Evt) => emit?.(e, s)
  let k = 0
  const stop = (label: string, why: string): DeqResult => {
    const reason = stopText(k, label, why)
    E({ msg: reason, anchors: [], stop: true })
    return { ok: false, states, final: list(), stoppedAt: k, reason }
  }
  E({ msg: `初始 deque：${init.length} 个元素，各占一个固定槽位（槽位不会因为别的元素进出而移动）。`, anchors: [] })
  for (const op of ops) {
    k++
    const label = opLabel(op, GRAMMAR)
    const n = list().length
    let r = '-'
    if (op.t === 'pushb') {
      s.hi++
      if (n === 0) s.lo = s.hi
      s.slots.set(s.hi, op.n[0]!)
      E({ msg: `${label}：新元素放进队尾的新槽位 ${s.hi}；其他元素的槽位不变（它们的引用仍然有效）。`, anchors: ['dPushB'], hot: s.hi })
    } else if (op.t === 'pushf') {
      s.lo--
      if (n === 0) s.hi = s.lo
      s.slots.set(s.lo, op.n[0]!)
      E({ msg: `${label}：新元素放进队首的新槽位 ${s.lo}；vector 做不到这一点（它得把所有元素后移）。`, anchors: ['dPushF'], hot: s.lo })
    } else if (op.t === 'popb') {
      if (n === 0) return stop(label, 'deque 为空')
      const v = s.slots.get(s.hi)!
      s.slots.delete(s.hi)
      s.hi--
      E({ msg: `${label}：移除队尾 ${v}（槽位 ${s.hi + 1} 空出），其余元素不动。`, anchors: ['dPopB'] })
    } else if (op.t === 'popf') {
      if (n === 0) return stop(label, 'deque 为空')
      const v = s.slots.get(s.lo)!
      s.slots.delete(s.lo)
      s.lo++
      E({ msg: `${label}：移除队首 ${v}（槽位 ${s.lo - 1} 空出），其余元素不动。这就是 queue::pop。`, anchors: ['dPopF'] })
    } else if (op.t === 'front') {
      if (n === 0) return stop(label, 'deque 为空')
      r = String(s.slots.get(s.lo)!)
      E({ msg: `${label}：返回队首 ${r}（槽位 ${s.lo}），只读不删除。`, anchors: ['dFront'], hot: s.lo })
    } else {
      if (n === 0) return stop(label, 'deque 为空')
      r = String(s.slots.get(s.hi)!)
      E({ msg: `${label}：返回队尾 ${r}（槽位 ${s.hi}），只读不删除。`, anchors: ['dBack'], hot: s.hi })
    }
    states.push(`r=${r} size=${list().length} [${list().join(' ')}]`)
  }
  E({ msg: `全部操作完成：size = ${list().length}。`, anchors: [] })
  return { ok: true, states, final: list() }
}

export const spec: FamSpec = {
  id: 'stl-deque',
  cppOnly: true,
  meta: {
    id: 'stl-deque',
    title: 'queue / deque 实验（固定槽位）',
    complexity: '两端 push / pop 均摊 O(1)；随机访问 O(1)；中间插入 O(n)',
    description: '队首和队尾的加入 / 移除都不会移动其他元素：每个元素占一个固定槽位。queue 只是 deque 的适配器。',
    implName: 'dequeModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_deque',
  fields: [
    { key: 'arr', label: '初始元素（0..6 个整数，队首→队尾）', kind: 'ints', minLen: 0, maxLen: 6, min: -99, max: 99 },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 14 },
  ],
  defaultDraft: { arr: '1, 2, 3', ops: 'pushb 4; pushf 0; front; back; popf; popb; popb; pushf 9; front' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const arr = ints(i, 'arr')
    const ops = i.ops as LabOp[]
    let lo = 0
    let hi = Math.max(0, arr.length - 1)
    simDeque(arr, ops, (_, s) => {
      lo = Math.min(lo, s.lo)
      hi = Math.max(hi, s.hi)
    })
    const W = hi - lo + 1
    const rec = new Recorder(DOC)
    const res = simDeque(arr, ops, (e, s) => {
      const cells: (number | string | null)[] = Array.from({ length: W }, (_, x) => s.slots.get(lo + x) ?? null)
      const marks: Record<number, FamMark> = {}
      if (s.hi >= s.lo) {
        marks[s.lo - lo] = 'cur'
        marks[s.hi - lo] = 'pivot'
      }
      if (e.hot !== undefined) marks[e.hot - lo] = 'hit'
      const size = s.hi >= s.lo ? s.hi - s.lo + 1 : 0
      rec.push(e.msg, fam(e.stop ? '已停止' : '槽位', [row('slots', '固定槽位（橙 = 队首，紫 = 队尾）', cells, marks, lo)], { scalars: [['size', 'size', size]] }), e.anchors, { size }, e.stop ? { phase: 'stopped' } : {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
