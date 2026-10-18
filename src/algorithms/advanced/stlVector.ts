import type { FamSpec, FamInput, LabGrammar, LabOp } from './famTypes'
import type { FamMark } from '../../types/advancedView'
import { Recorder } from './common'
import { fam, ints, row } from './famCommon'
import { opLabel, stopText } from './labCommon'

const DOC = 'stl_vector.cpp'
export const GRAMMAR: LabGrammar = {
  push: { args: ['i'] },
  reserve: { args: ['i'], lo: 0, hi: 24 },
  resize: { args: ['i'], lo: 0, hi: 24 },
  insert: { args: ['i', 'i'], lo: -99, hi: 99 },
  erase: { args: ['i'], lo: 0, hi: 24 },
  shrink: { args: [] },
  it: { args: ['i'], lo: 0, hi: 24 },
  use: { args: [] },
}

export interface VecResult {
  ok: boolean
  states: string[]
  finalSize: number
  finalCap: number
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
  data: number[]
  cap: number
  buf: number
  it: { idx: number; buf: number; valid: boolean } | null
  re: boolean
}

/** Pure model of std::vector<int> as implemented by libstdc++ (capacity growth is implementation-defined). */
export function simVector(init: number[], ops: LabOp[], emit?: (e: Evt, s: St) => void): VecResult {
  const s: St = { data: [...init], cap: init.length, buf: 1, it: null, re: false }
  const states: string[] = []
  const E = (e: Evt) => emit?.(e, s)
  const dump = () => `size=${s.data.length} cap=${s.cap} re=${s.re ? 1 : 0} [${s.data.join(' ')}]`
  const realloc = (newCap: number) => {
    s.cap = newCap
    s.buf++
    s.re = true
    if (s.it) s.it.valid = false // a reallocation invalidates ALL iterators
  }
  let k = 0
  const stop = (label: string, why: string): VecResult => {
    const reason = stopText(k, label, why)
    E({ msg: reason, anchors: [], stop: true })
    return { ok: false, states, finalSize: s.data.length, finalCap: s.cap, stoppedAt: k, reason }
  }
  E({ msg: `初始 vector：size = ${s.data.length}，capacity = ${s.cap}。每个槽位是 capacity 的一格，已用的格子里是元素。`, anchors: [] })
  for (const op of ops) {
    k++
    s.re = false
    const label = opLabel(op, GRAMMAR)
    const n = s.data.length
    if (op.t === 'push') {
      const x = op.n[0]!
      if (n === s.cap) {
        realloc(s.cap ? s.cap * 2 : 1)
        E({ msg: `${label}：size = capacity = ${n}，放不下 → 重新分配更大的缓冲区（本实现翻倍：capacity ${n} → ${s.cap}），旧元素搬过去，所有迭代器失效。`, anchors: ['vPush'] })
      }
      s.data.push(x)
      E({ msg: `${label}：${x} 放进第 ${s.data.length - 1} 格，size = ${s.data.length}，capacity = ${s.cap}${s.re ? '' : '（空间够，没有重新分配）'}。`, anchors: ['vPush'], hot: s.data.length - 1 })
    } else if (op.t === 'reserve') {
      const c = op.n[0]!
      if (c > s.cap) {
        realloc(c)
        E({ msg: `${label}：${c} > 原 capacity → 重新分配，capacity = ${c}；size 仍为 ${n}（reserve 不创建元素），所有迭代器失效。`, anchors: ['vReserve'] })
      } else E({ msg: `${label}：${c} ≤ capacity ${s.cap}，什么都不做（reserve 不会缩小）。`, anchors: ['vReserve'] })
    } else if (op.t === 'resize') {
      const c = op.n[0]!
      if (c < n) {
        const cut = s.data.slice(c)
        s.data.length = c
        if (s.it && s.it.valid && s.it.idx >= c) s.it.valid = false
        E({ msg: `${label}：截断到 ${c} 个元素（丢掉 ${cut.join(', ')}），capacity 不变 = ${s.cap}；指向被删元素的迭代器失效。`, anchors: ['vResize'] })
      } else if (c > n) {
        const add = c - n
        if (add > s.cap - n) {
          realloc(n + Math.max(n, add))
          E({ msg: `${label}：需要再放 ${add} 个，剩余空位不足 → 重新分配（本实现：新 capacity = size + max(size, 新增) = ${s.cap}），所有迭代器失效。`, anchors: ['vResize'] })
        }
        for (let i = 0; i < add; i++) s.data.push(0)
        E({ msg: `${label}：size 变成 ${c}，新增的 ${add} 个元素被值初始化为 0（reserve 不会这样，resize 会真的创建元素）。`, anchors: ['vResize'], hot: c - 1 })
      } else E({ msg: `${label}：size 已经是 ${c}，没有变化。`, anchors: ['vResize'] })
    } else if (op.t === 'insert') {
      const [i, x] = [op.n[0]!, op.n[1]!]
      if (i < 0 || i > n) return stop(label, `插入位置 ${i} 超出 [0, size=${n}]`)
      if (n === s.cap) {
        realloc(s.cap ? s.cap * 2 : 1)
        E({ msg: `${label}：已满 → 重新分配（capacity → ${s.cap}），所有迭代器失效。`, anchors: ['vInsert'] })
      } else if (s.it && s.it.valid && s.it.idx >= i) s.it.valid = false
      s.data.splice(i, 0, x)
      E({ msg: `${label}：${x} 插在第 ${i} 格，原来第 ${i} 格起的元素整体后移一格${s.re ? '' : '；插入点及之后的迭代器失效，之前的仍有效（未重新分配时）'}。`, anchors: ['vInsert'], hot: i })
    } else if (op.t === 'erase') {
      const i = op.n[0]!
      if (i >= n) return stop(label, `删除位置 ${i} 超出 [0, size=${n})`)
      const [gone] = s.data.splice(i, 1)
      if (s.it && s.it.valid && s.it.idx >= i) s.it.valid = false
      E({ msg: `${label}：删除 ${gone}，其后元素前移一格；capacity 不变 = ${s.cap}（erase 从不缩小容量）；删除点及之后的迭代器失效。`, anchors: ['vErase'], hot: Math.min(i, s.data.length - 1) })
    } else if (op.t === 'shrink') {
      if (s.cap !== n) {
        realloc(n)
        E({ msg: `${label}：capacity ${s.cap} 之外的多余空间被释放（这是"请求"，标准不保证；本实现会做）：capacity = size = ${n}，所有迭代器失效。`, anchors: ['vShrink'] })
      } else E({ msg: `${label}：capacity 已经等于 size，不重新分配。`, anchors: ['vShrink'] })
    } else if (op.t === 'it') {
      const i = op.n[0]!
      if (i >= n) return stop(label, `begin() + ${i} 不指向任何元素（size = ${n}）`)
      s.it = { idx: i, buf: s.buf, valid: true }
      E({ msg: `${label}：迭代器 it 指向第 ${i} 格（值 ${s.data[i]}），属于当前缓冲区 #${s.buf}。`, anchors: ['vIter'], hot: i })
    } else {
      if (!s.it) return stop(label, '还没有取得迭代器（先 it i）')
      if (!s.it.valid) return stop(label, `迭代器（原指向第 ${s.it.idx} 格）已经失效，解引用它是未定义行为`)
      E({ msg: `${label}：迭代器有效，*it = ${s.data[s.it.idx]}。`, anchors: ['vUse'], hot: s.it.idx })
    }
    states.push(dump())
  }
  s.re = false
  E({ msg: `全部操作完成：size = ${s.data.length}，capacity = ${s.cap}。`, anchors: [] })
  return { ok: true, states, finalSize: s.data.length, finalCap: s.cap }
}

export const spec: FamSpec = {
  id: 'stl-vector',
  cppOnly: true,
  meta: {
    id: 'stl-vector',
    title: 'vector 与迭代器实验（reserve vs resize、迭代器失效）',
    complexity: 'push_back 摊还 O(1)；insert/erase O(n)；reserve/resize 可能 O(n)',
    description: '同一个缓冲区里 size 与 capacity 是两回事：reserve 只改 capacity，resize 才创建元素；一旦重新分配，所有迭代器失效。',
    implName: 'vectorModel',
    implVersion: '1.0.0',
    docId: DOC,
  },
  catalogId: 'stl_vector',
  fields: [
    { key: 'arr', label: '初始元素（0..8 个整数）', kind: 'ints', minLen: 0, maxLen: 8, min: -99, max: 99 },
    { key: 'ops', label: '操作（用分号隔开）', kind: 'ops', grammar: GRAMMAR, maxOps: 12 },
  ],
  defaultDraft: { arr: '1, 2, 3', ops: 'it 1; use; push 4; use; reserve 8; it 0; push 5; use; resize 7; shrink' },
  readyText: '尚未执行任何操作。',
  generate(i: FamInput) {
    const arr = ints(i, 'arr')
    const ops = i.ops as LabOp[]
    let L = 1
    simVector(arr, ops, (_, s) => (L = Math.max(L, s.cap, s.data.length)))
    const rec = new Recorder(DOC)
    const res = simVector(arr, ops, (e, s) => {
      const cells: (number | string | null)[] = Array.from({ length: L }, (_, x) => (x < s.data.length ? s.data[x]! : x < s.cap ? null : '░'))
      const marks: Record<number, FamMark> = {}
      if (e.hot !== undefined) marks[e.hot] = 'hit'
      if (s.it && s.it.idx < L) marks[s.it.idx] = s.it.valid ? 'cur' : 'warn'
      const itText = !s.it ? '未取得' : s.it.valid ? `有效（第 ${s.it.idx} 格）` : '已失效'
      rec.push(e.msg, fam(e.stop ? '已停止' : '槽位', [row('slots', `缓冲区 #${s.buf}（░ = 未分配）`, cells, marks)], { scalars: [['size', 'size', s.data.length], ['cap', 'capacity', s.cap], ['buf', '缓冲区编号', s.buf], ['it', '迭代器', itText]] }), e.anchors, { size: s.data.length, cap: s.cap, buf: s.buf }, e.stop ? { phase: 'stopped' } : {})
    })
    rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result: res }
    return { steps: rec.steps, result: res }
  },
}
