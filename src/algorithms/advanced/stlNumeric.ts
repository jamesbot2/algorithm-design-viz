import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'
import { opLabel } from './labCommon'

const DOC = 'stl_numeric.cpp'
export const GRAMMAR: LabGrammar = {
  iota: { args: ['i'], lo: -9, hi: 9 },
  acc: { args: [] },
  psum: { args: [] },
  adiff: { args: [] },
  gcdall: { args: [] },
  bset: { args: ['i'], lo: 0, hi: 15 },
  bflip: { args: ['i'], lo: 0, hi: 15 },
  bcnt: { args: [] },
  bshl: { args: ['i'], lo: 0, hi: 15 },
}
export interface NumResult {
  ok: boolean
  states: string[]
  final: number[]
  bits: string
}
interface Evt {
  msg: string
  anchors: string[]
  marks?: Record<number, FamMark>
  bmarks?: Record<number, FamMark>
  r?: string
}
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/** int arithmetic: values stay far below 2^31 for ≤ 8 elements, |x| ≤ 99, ≤ 10 ops: even 10 psums stay below 2e6·99. */
export function simNumeric(init: number[], ops: LabOp[], emit?: (e: Evt, v: number[], b: boolean[]) => void): NumResult {
  const v = [...init]
  const b: boolean[] = Array(16).fill(false) // b[i] = bit i
  const bits = () => b.map((x) => (x ? '1' : '0')).reverse().join('')
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, v, b)
  E({ msg: `初始：数组 ${v.length} 个元素，bitset<16> 全为 0。`, anchors: [] })
  for (const op of ops) {
    const label = opLabel(op, GRAMMAR)
    let r = '-'
    const all = (m: FamMark): Record<number, FamMark> => Object.fromEntries(v.map((_, i) => [i, m]))
    if (op.t === 'iota') {
      const x = op.n[0]!
      v.forEach((_, i) => (v[i] = x + i))
      E({ msg: `${label}：依次填入 ${x}, ${x + 1}, ${x + 2}, …（原内容被覆盖）。`, anchors: ['nIota'], marks: all('done') })
    } else if (op.t === 'acc') {
      r = String(v.reduce((a, c) => a + c, 0))
      E({ msg: `${label}：accumulate(…, 0LL) = ${r}。初值写 0 会在 int 里累加，可能溢出；写 0LL 才是 long long。`, anchors: ['nAcc'], marks: all('range'), r })
    } else if (op.t === 'psum') {
      for (let i = 1; i < v.length; i++) v[i]! += v[i - 1]!
      E({ msg: `${label}：原地前缀和，v[i] = 原 v[0] + … + 原 v[i]。`, anchors: ['nPsum'], marks: all('done') })
    } else if (op.t === 'adiff') {
      for (let i = v.length - 1; i >= 1; i--) v[i]! -= v[i - 1]!
      E({ msg: `${label}：原地相邻差，v[0] 不变，v[i] = 原 v[i] − 原 v[i-1]（psum 的逆运算）。`, anchors: ['nAdiff'], marks: all('done') })
    } else if (op.t === 'gcdall') {
      let g = 0
      for (const x of v) g = gcd(g, x)
      r = String(g)
      E({ msg: `${label}：逐个折叠 gcd，从 0 开始（gcd(0, x) = |x|）；结果 ${r}。全为 0 时结果是 0。`, anchors: ['nGcd'], marks: all('range'), r })
    } else if (op.t === 'bset') {
      const i = op.n[0]!
      b[i] = true
      E({ msg: `${label}：把第 ${i} 位置 1（从右往左数，第 0 位是最低位）。`, anchors: ['bSet'], bmarks: { [i]: 'hit' } })
    } else if (op.t === 'bflip') {
      const i = op.n[0]!
      b[i] = !b[i]
      E({ msg: `${label}：翻转第 ${i} 位，现在是 ${b[i] ? 1 : 0}。`, anchors: ['bFlip'], bmarks: { [i]: 'hit' } })
    } else if (op.t === 'bcnt') {
      r = String(b.filter(Boolean).length)
      E({ msg: `${label}：1 的个数 = ${r}。`, anchors: ['bCnt'], r })
    } else {
      const k = op.n[0]!
      for (let i = 15; i >= 0; i--) b[i] = i - k >= 0 ? b[i - k]! : false
      E({ msg: `${label}：整体左移 ${k} 位，移出第 15 位的丢弃，低位补 0。`, anchors: ['bShl'] })
    }
    states.push(`r=${r} v=[${v.join(' ')}] b=${bits()}`)
  }
  E({ msg: '全部操作完成。', anchors: [] })
  return { ok: true, states, final: [...v], bits: bits() }
}

export const spec: FamSpec = {
  id: 'stl-numeric',
  cppOnly: true,
  meta: {
    id: 'stl-numeric',
    title: 'numeric 与 bitset 实验',
    complexity: 'iota / accumulate / partial_sum / adjacent_difference / gcd 折叠均 O(n)；bitset 单点 O(1)，count / 移位 O(N/64)',
    description: 'iota、accumulate、partial_sum、adjacent_difference、gcd，以及 bitset<16> 的 set / flip / count / 左移。',
    implName: 'numericModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_numeric',
  fields: [
    { key: 'arr', label: '初始数组（1..8 个整数）', kind: 'ints', minLen: 1, maxLen: 8, min: -99, max: 99 },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 10 },
  ],
  defaultDraft: { arr: '4, 6, 8, 10', ops: 'gcdall; acc; psum; adiff; iota 5; bset 3; bflip 0; bcnt; bshl 2' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const arr = ints(i, 'arr')
    const ops = i.ops as LabOp[]
    const rec = new Recorder(DOC)
    const res = simNumeric(arr, ops, (e, v, b) => {
      const bm: Record<number, FamMark> = {}
      b.forEach((x, k) => {
        if (x) bm[15 - k] = 'cur'
      })
      for (const [k, m] of Object.entries(e.bmarks ?? {})) bm[15 - Number(k)] = m
      rec.push(e.msg, fam('numeric', [row('v', 'v', v, e.marks ?? {}), row('b', 'bitset<16>（左边是第 15 位）', b.map((x) => (x ? 1 : 0)).reverse(), bm)], e.r !== undefined ? { scalars: [['r', '结果', e.r]] } : {}), e.anchors, {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
