import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'
import { opLabel, stopText } from './labCommon'

const DOC = 'stl_algo.cpp'
export const GRAMMAR: LabGrammar = {
  srt: { args: [] },
  rsrt: { args: [] },
  rev: { args: [] },
  rot: { args: ['i'], lo: 0, hi: 8 },
  nperm: { args: [] },
  pperm: { args: [] },
  nth: { args: ['i'], lo: 0, hi: 7 },
  cnt: { args: ['i'], lo: -9, hi: 9 },
  mx: { args: [] },
  lbd: { args: ['i'], lo: -9, hi: 9 },
}
export interface AlgoResult {
  ok: boolean
  states: string[]
  final: number[]
  stoppedAt?: number
  reason?: string
}
interface Evt {
  msg: string
  anchors: string[]
  marks?: Record<number, FamMark>
  r?: string
  ghost?: number[]
  stop?: boolean
}
const asc = (a: number[]) => a.every((x, i) => i === 0 || a[i - 1]! <= x)

/** std::next_permutation on a vector (same algorithm as libstdc++; result is fully determined by the standard). */
function nextPerm(a: number[], dir: 1 | -1): boolean {
  const lt = (x: number, y: number) => (dir === 1 ? x < y : x > y)
  let i = a.length - 2
  while (i >= 0 && !lt(a[i]!, a[i + 1]!)) i--
  if (i < 0) {
    a.reverse()
    return false
  }
  let j = a.length - 1
  while (!lt(a[i]!, a[j]!)) j--
  ;[a[i], a[j]] = [a[j]!, a[i]!]
  const tail = a.splice(i + 1).reverse()
  a.push(...tail)
  return true
}

export function simAlgo(init: number[], ops: LabOp[], emit?: (e: Evt, v: number[]) => void): AlgoResult {
  const v = [...init]
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, v)
  let k = 0
  let sorted = false
  const stop = (label: string, why: string): AlgoResult => {
    const reason = stopText(k, label, why)
    E({ msg: reason, anchors: [], stop: true })
    return { ok: false, states, final: [...v], stoppedAt: k, reason }
  }
  E({ msg: `初始数组（${v.length} 个元素）。`, anchors: [] })
  for (const op of ops) {
    k++
    const label = opLabel(op, GRAMMAR)
    let r = '-'
    const n = v.length
    const all = (m: FamMark): Record<number, FamMark> => Object.fromEntries(v.map((_, i) => [i, m]))
    const wasSorted = sorted
    sorted = false
    if (op.t === 'srt') {
      v.sort((a, b) => a - b)
      sorted = true
      E({ msg: `${label}：升序排列（std::sort，O(n log n)，不稳定——对 int 看不出区别）。`, anchors: ['aSort'], marks: all('done') })
    } else if (op.t === 'rsrt') {
      v.sort((a, b) => b - a)
      E({ msg: `${label}：用 std::greater<int>() 降序排列。`, anchors: ['aRSort'], marks: all('done') })
    } else if (op.t === 'rev') {
      v.reverse()
      E({ msg: `${label}：整体翻转。`, anchors: ['aRev'], marks: all('pivot') })
    } else if (op.t === 'rot') {
      const c = op.n[0]!
      if (c > n) return stop(label, `k ${c} > size() ${n}，begin() + k 越过 end()`)
      v.push(...v.splice(0, c))
      E({ msg: `${label}：左移 ${c} 位，原来的 v[${c}] 成为首元素。`, anchors: ['aRot'], marks: all('range') })
    } else if (op.t === 'nperm' || op.t === 'pperm') {
      const ok = nextPerm(v, op.t === 'nperm' ? 1 : -1)
      r = ok ? '1' : '0'
      E({ msg: `${label}：${ok ? `变成字典序${op.t === 'nperm' ? '下' : '上'}一个排列` : `已经是字典序${op.t === 'nperm' ? '最大' : '最小'}排列，回绕成${op.t === 'nperm' ? '最小' : '最大'}排列并返回 false`}（返回 ${r}）。`, anchors: [op.t === 'nperm' ? 'aNext' : 'aPrev'], marks: all('range'), r })
    } else if (op.t === 'nth') {
      const c = op.n[0]!
      if (c >= n) return stop(label, `k ${c} ≥ size() ${n}`)
      const t = [...v].sort((a, b) => a - b)
      r = String(t[c])
      E({ msg: `${label}：在副本上做 nth_element：第 ${c} 小的元素是 ${r}。标准只保证这一个位置正确，副本里其余元素的顺序未指定，所以本实验不显示副本，原数组不变。`, anchors: ['aNth'], r })
    } else if (op.t === 'cnt') {
      const x = op.n[0]!
      r = String(v.filter((y) => y === x).length)
      E({ msg: `${label}：等于 ${x} 的元素有 ${r} 个。`, anchors: ['aCnt'], marks: Object.fromEntries(v.map((y, i) => [i, y === x ? 'hit' : 'cur']).filter((p) => p[1] === 'hit')) as Record<number, FamMark>, r })
    } else if (op.t === 'mx') {
      if (n === 0) return stop(label, '数组为空')
      let b = 0
      for (let i = 1; i < n; i++) if (v[i]! > v[b]!) b = i
      r = String(b)
      E({ msg: `${label}：第一个最大元素 ${v[b]} 的下标是 ${b}（并列时取最靠前的）。`, anchors: ['aMax'], marks: { [b]: 'hit' }, r })
    } else {
      if (!wasSorted || !asc(v)) return stop(label, 'lower_bound 要求区间已按 < 排好序，而当前数组不是（必须紧跟在 srt 之后）')
      const x = op.n[0]!
      let lo = 0
      while (lo < n && v[lo]! < x) lo++
      r = String(lo)
      E({ msg: `${label}：第一个 ≥ ${x} 的位置是 ${lo}${lo === n ? '（= end，没有这样的元素）' : ''}。`, anchors: ['aLb'], marks: lo < n ? { [lo]: 'hit' } : {}, r })
      sorted = true
    }
    states.push(`r=${r} v=[${v.join(' ')}]`)
  }
  E({ msg: `全部操作完成。`, anchors: [] })
  return { ok: true, states, final: [...v] }
}

export const spec: FamSpec = {
  id: 'stl-algo',
  cppOnly: true,
  meta: {
    id: 'stl-algo',
    title: '标准算法实验：sort / nth_element / next_permutation',
    complexity: 'sort O(n log n)；nth_element 平均 O(n)；next_permutation O(n)；lower_bound O(log n)（要求有序）',
    description: '对 vector<int> 逐个调用 sort、reverse、rotate、next_permutation、nth_element、count、max_element、lower_bound。',
    implName: 'algoModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_algo',
  fields: [
    { key: 'arr', label: '初始数组（1..8 个整数）', kind: 'ints', minLen: 1, maxLen: 8, min: -9, max: 9 },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 12 },
  ],
  defaultDraft: { arr: '3, 1, 2', ops: 'nperm; nperm; nth 1; srt; lbd 2; rot 1; rsrt; cnt 3; mx' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const arr = ints(i, 'arr')
    const ops = i.ops as LabOp[]
    const rec = new Recorder(DOC)
    const res = simAlgo(arr, ops, (e, v) => {
      rec.push(e.msg, fam(e.stop ? '已停止' : '数组', [row('v', 'v', v, e.marks ?? {})], e.r !== undefined ? { scalars: [['r', '结果', e.r]] } : {}), e.anchors, {}, e.stop ? { phase: 'stopped' } : {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
