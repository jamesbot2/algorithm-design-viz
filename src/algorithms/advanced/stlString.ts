import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, row } from './famCommon'
import { opLabel, stopText } from './labCommon'

const DOC = 'stl_string.cpp'
export const MAXLEN = 24
export const GRAMMAR: LabGrammar = {
  app: { args: ['w'] },
  sub: { args: ['i', 'i'], lo: 0, hi: 30 },
  find: { args: ['w'] },
  rfind: { args: ['w'] },
  ers: { args: ['i', 'i'], lo: 0, hi: 30 },
  ins: { args: ['i', 'w'], lo: 0, hi: 30 },
  pless: { args: ['i', 'i', 'i', 'i'], lo: -9, hi: 9 },
  tless: { args: ['i', 'i', 'i', 'i', 'i', 'i'], lo: -9, hi: 9 },
}
export interface StrResult {
  ok: boolean
  states: string[]
  final: string
  stoppedAt?: number
  reason?: string
}
interface Evt {
  msg: string
  anchors: string[]
  hl?: [number, number, FamMark]
  r?: string
  stop?: boolean
}

/** One real std::string call per op. find / rfind return npos (shown as "npos"). Out-of-range pos stops BEFORE the throwing call. */
export function simString(init: string, ops: LabOp[], emit?: (e: Evt, s: string) => void): StrResult {
  let s = init
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, s)
  let k = 0
  const stop = (label: string, why: string, limit = false): StrResult => {
    const reason = limit ? `第 ${k} 个操作「${label}」：${why}。这是本实验的长度限制（不是 C++ 的行为），在此停止。` : stopText(k, label, why)
    E({ msg: reason, anchors: [], stop: true })
    return { ok: false, states, final: s, stoppedAt: k, reason }
  }
  E({ msg: `初始字符串 "${init}"（长度 ${init.length}）。`, anchors: [] })
  for (const op of ops) {
    k++
    const label = opLabel(op, GRAMMAR)
    let r = '-'
    const n = s.length
    if (op.t === 'app') {
      if (n + op.w[0]!.length > MAXLEN) return stop(label, `追加后长度会超过 ${MAXLEN}`, true)
      s += op.w[0]!
      E({ msg: `${label}：在末尾追加 "${op.w[0]}"，长度变为 ${s.length}。`, anchors: ['stApp'], hl: [n, op.w[0]!.length, 'hit'] })
    } else if (op.t === 'sub') {
      const [p, c] = op.n as [number, number]
      if (p > n) return stop(label, `pos ${p} > size() ${n}，substr 会抛出 out_of_range`)
      r = s.slice(p, p + c)
      E({ msg: `${label}：取从 ${p} 起至多 ${c} 个字符，得到 "${r}"（长度 ${r.length}）；原串不变。pos == size() 合法，得到空串。`, anchors: ['stSub'], hl: [p, r.length, 'range'], r })
    } else if (op.t === 'find' || op.t === 'rfind') {
      const x = op.w[0]!
      const pos = op.t === 'find' ? s.indexOf(x) : s.lastIndexOf(x)
      r = pos < 0 ? 'npos' : String(pos)
      E({
        msg: pos < 0 ? `${label}：没有找到 "${x}"，返回 npos（size_t 的最大值，不是 -1）。` : `${label}：${op.t === 'find' ? '第一次' : '最后一次'}出现在位置 ${pos}。`,
        anchors: [op.t === 'find' ? 'stFind' : 'stRfind'],
        ...(pos >= 0 ? { hl: [pos, x.length, 'hit'] as [number, number, FamMark] } : {}),
        r,
      })
    } else if (op.t === 'ers') {
      const [p, c] = op.n as [number, number]
      if (p > n) return stop(label, `pos ${p} > size() ${n}，erase 会抛出 out_of_range`)
      const cut = Math.min(c, n - p)
      E({ msg: `${label}：删除从 ${p} 起的 ${cut} 个字符（至多 ${c} 个，不会越过末尾）。`, anchors: ['stErase'], hl: [p, cut, 'warn'] })
      s = s.slice(0, p) + s.slice(p + c)
    } else if (op.t === 'ins') {
      const p = op.n[0]!
      const x = op.w[0]!
      if (p > n) return stop(label, `pos ${p} > size() ${n}，insert 会抛出 out_of_range`)
      if (n + x.length > MAXLEN) return stop(label, `插入后长度会超过 ${MAXLEN}`, true)
      s = s.slice(0, p) + x + s.slice(p)
      E({ msg: `${label}：在位置 ${p} 之前插入 "${x}"，原来 ≥ ${p} 的字符后移。`, anchors: ['stIns'], hl: [p, x.length, 'hit'] })
    } else if (op.t === 'pless') {
      const [a, b, c, d] = op.n as [number, number, number, number]
      const v = a < c || (a === c && b < d)
      r = v ? '1' : '0'
      E({ msg: `${label}：(${a},${b}) < (${c},${d})？${a !== c ? `first ${a} ${a < c ? '<' : '>'} ${c}，直接决定` : `first 相等，比 second：${b} ${b < d ? '<' : b > d ? '>' : '='} ${d}`} → ${r}。`, anchors: ['stPair'], r })
    } else {
      const x = op.n as number[]
      let v = false
      let why = '三个元素都相等，不小于'
      for (let i = 0; i < 3; i++) {
        if (x[i] !== x[i + 3]) {
          v = x[i]! < x[i + 3]!
          why = `第 ${i + 1} 个元素 ${x[i]} ${v ? '<' : '>'} ${x[i + 3]} 决定`
          break
        }
      }
      r = v ? '1' : '0'
      E({ msg: `${label}：(${x.slice(0, 3).join(',')}) < (${x.slice(3).join(',')})？${why} → ${r}。`, anchors: ['stTuple'], r })
    }
    states.push(`r=${r} s=${s}`)
  }
  E({ msg: `全部操作完成：最终字符串 "${s}"。`, anchors: [] })
  return { ok: true, states, final: s }
}

export const spec: FamSpec = {
  id: 'stl-string',
  cppOnly: true,
  meta: {
    id: 'stl-string',
    title: 'string / pair / tuple 实验',
    complexity: 'find / rfind 最坏 O(n·m)；substr / erase / insert O(n)；pair / tuple 比较 O(元素个数)',
    description: 'std::string 的查找、截取、删除、插入（npos、out_of_range），以及 pair / tuple 的字典序比较。',
    implName: 'stringModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_string',
  fields: [
    { key: 's', label: '初始字符串（0..8 个小写字母）', kind: 'word' },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 12 },
  ],
  defaultDraft: { s: 'abcab', ops: 'app ab; find ab; rfind ab; find zz; sub 1 3; ers 0 2; ins 2 xy; pless 1 2 1 3; tless 1 2 3 1 2 4' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const init = i.s as string
    const ops = i.ops as LabOp[]
    let W = init.length
    simString(init, ops, (_, s) => (W = Math.max(W, s.length)))
    W = Math.max(W, 1)
    const rec = new Recorder(DOC)
    const res = simString(init, ops, (e, s) => {
      const cells: (string | null)[] = Array.from({ length: W }, (_, x) => (x < s.length ? s[x]! : null))
      const marks: Record<number, FamMark> = {}
      if (e.hl) for (let x = e.hl[0]; x < e.hl[0] + e.hl[1]; x++) marks[x] = e.hl[2]
      rec.push(e.msg, fam(e.stop ? '已停止' : 'string', [row('chars', `s（size = ${s.length}）`, cells, marks)], { scalars: [['size', 'size', s.length], ...(e.r !== undefined ? ([['r', '结果', e.r]] as [string, string, string][]) : [])] }), e.anchors, { size: s.length }, e.stop ? { phase: 'stopped' } : {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
