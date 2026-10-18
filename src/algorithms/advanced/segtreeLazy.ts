import type { Step } from '../../types/step'
import type { SegView } from '../../types/advancedView'
import type { LazyInput } from '../../features/advanced/inputs'
import { Recorder } from './common'
import { segSlots } from './segtree'

export const meta = {
  id: 'segtree-lazy',
  title: '懒标记线段树（区间加 + 区间和）',
  complexity: '建树 O(n)，单次 add / sum O(log n)，空间 O(n)',
  description: '递归线段树 + 懒标记：add 时完全覆盖的结点只打标记；需要下探时先 push 再递归，回溯时 pull。',
  implName: 'lazySegTreeRangeAddRangeSum',
  implVersion: '1.0.0',
  docId: 'segtree_lazy.ts',
  defaultArr: '5, 3, 8, 1, 9, 2, 7, 4',
  defaultOps: 'add 1 6 10; sum 2 5; add 3 5 -4; sum 0 8; sum 4 5',
}

export interface LazyResult {
  ok: true
  total: number[]
  lazy: number[]
  values: number[]
  answers: { op: string; value: number }[]
}

export function generateLazySteps(input: LazyInput): { steps: Step[]; result: LazyResult } {
  const { arr, ops } = input
  const n = arr.length
  const values = [...arr]
  const total = new Array<number>(segSlots(n)).fill(0)
  const lazy = new Array<number>(segSlots(n)).fill(0)
  const built = new Set<number>()
  const rec = new Recorder(meta.docId)
  const answers: LazyResult['answers'] = []
  const view = (op: string, extra: Partial<SegView> = {}): SegView => ({
    kind: 'seg',
    n,
    tree: Array.from({ length: segSlots(n) }, (_, i) => (built.has(i) ? total[i]! : null)),
    lazy: [...lazy],
    op,
    visited: [],
    ...extra,
  })
  rec.push(`数组 a = [${arr.join(', ')}]，n=${n}。每个结点存区间和 total 和一个懒标记 lazy（"还欠孩子的增量"）。`, view('初始'), [], { n })

  const build = (node: number, lo: number, hi: number, vis: SegView['visited']) => {
    built.add(node)
    if (hi - lo === 1) {
      total[node] = arr[lo]!
      vis.push({ node, role: 'leaf' })
      rec.push(`叶子 [${lo},${hi}) = a[${lo}] = ${arr[lo]}。`, view('建树', { node, visited: [...vis] }), ['buildLeaf'], { node, lo, hi })
      return
    }
    const mid = lo + ((hi - lo) >> 1)
    build(2 * node, lo, mid, vis)
    build(2 * node + 1, mid, hi, vis)
    total[node] = total[2 * node]! + total[2 * node + 1]!
    vis.push({ node, role: 'split' })
    rec.push(`结点 ${node} [${lo},${hi})：total = ${total[2 * node]} + ${total[2 * node + 1]} = ${total[node]}。`, view('建树', { node, visited: [...vis] }), ['buildPull'], { node, lo, hi, total: total[node]! })
  }
  if (n > 0) {
    rec.push('从根结点 [0,n) 开始递归建树。', view('建树', { node: 1 }), ['buildCall'], { n })
    build(1, 0, n, [])
  }

  let label = ''
  let vis: SegView['visited'] = []
  let ctx: Partial<SegView> = {}
  const F = (node: number, extra: Partial<SegView> = {}) => view(label, { node, visited: [...vis], ...ctx, ...extra })

  const apply = (node: number, lo: number, hi: number, v: number, anchors: string[], why: string) => {
    total[node]! += v * (hi - lo)
    lazy[node]! += v
    rec.push(`${why}：total[${node}] += ${v}×${hi - lo} → ${total[node]}；lazy[${node}] += ${v} → ${lazy[node]}（孩子尚未更新）。`, F(node, { tagged: [node] }), anchors, { node, lo, hi, v, total: total[node]!, lazy: lazy[node]! })
  }
  const push = (node: number, lo: number, hi: number, owner: 'add' | 'query') => {
    if (lazy[node] === 0) return
    const mid = lo + ((hi - lo) >> 1)
    const t = lazy[node]!
    apply(2 * node, lo, mid, t, ['pushLeft', 'applyTotal', 'applyTag'], `push：结点 ${node} 的标记 ${t} 交给左孩子 ${2 * node}`)
    apply(2 * node + 1, mid, hi, t, ['pushRight', 'applyTotal', 'applyTag'], `push：结点 ${node} 的标记 ${t} 交给右孩子 ${2 * node + 1}`)
    lazy[node] = 0
    rec.push(`push 完成：lazy[${node}] 清零（${owner === 'add' ? 'add' : 'query'} 之前必须先做这一步）。`, F(node, { tagged: [node] }), ['pushClear'], { node, lazy: 0 })
  }

  for (const op of ops) {
    vis = []
    if (op.t === 'add') {
      const { l, r, v } = op
      label = `add(${l}, ${r}, ${v})`
      ctx = { query: [l, r], adding: { l, r, v } }
      rec.push(`${label}：给 a[${l}..${r}) 每个元素加 ${v}。`, F(1), ['addCall'], { l, r, v })
      for (let i = l; i < r; i++) values[i]! += v
      const go = (node: number, lo: number, hi: number) => {
        if (r <= lo || hi <= l) {
          vis.push({ node, role: 'outside' })
          rec.push(`结点 ${node} [${lo},${hi}) 与 [${l},${r}) 不相交 → 返回。`, F(node), ['addOutside'], { node, lo, hi })
          return
        }
        if (l <= lo && hi <= r) {
          vis.push({ node, role: 'inside' })
          apply(node, lo, hi, v, ['addInside', 'applyTotal', 'applyTag'], `结点 ${node} [${lo},${hi}) 完全被覆盖 → 只打标记`)
          return
        }
        vis.push({ node, role: 'split' })
        rec.push(`结点 ${node} [${lo},${hi}) 部分重叠 → 先 push 再递归。`, F(node), ['addPush'], { node, lo, hi })
        push(node, lo, hi, 'add')
        const mid = lo + ((hi - lo) >> 1)
        rec.push(`拆成 [${lo},${mid}) 与 [${mid},${hi})，递归处理两个孩子。`, F(node), ['addSplit'], { node, mid })
        go(2 * node, lo, mid)
        go(2 * node + 1, mid, hi)
        total[node] = total[2 * node]! + total[2 * node + 1]!
        rec.push(`回溯 pull：total[${node}] = ${total[2 * node]} + ${total[2 * node + 1]} = ${total[node]}。`, F(node), ['addPull'], { node, total: total[node]! })
      }
      go(1, 0, n)
      continue
    }
    const { l, r } = op
    label = `sum(${l}, ${r})`
    let acc = 0
    ctx = { query: [l, r], accum: 0 }
    rec.push(`${label}：区间 [${l},${r}) 的和。`, F(1), ['sumCall'], { l, r })
    const q = (node: number, lo: number, hi: number): number => {
      if (r <= lo || hi <= l) {
        vis.push({ node, role: 'outside' })
        rec.push(`结点 ${node} [${lo},${hi}) 与 [${l},${r}) 不相交 → 0。`, F(node), ['queryOutside'], { node, lo, hi })
        return 0
      }
      if (l <= lo && hi <= r) {
        vis.push({ node, role: 'inside' })
        acc += total[node]!
        ctx = { query: [l, r], accum: acc }
        rec.push(`结点 ${node} [${lo},${hi}) 完全落在内 → total[${node}] = ${total[node]}（累计 ${acc}）。`, F(node), ['queryInside'], { node, lo, hi, value: total[node]!, acc })
        return total[node]!
      }
      vis.push({ node, role: 'split' })
      rec.push(`结点 ${node} [${lo},${hi}) 部分重叠 → 先 push（孩子的和可能是旧的）再下探。`, F(node), ['queryPush'], { node, lo, hi })
      push(node, lo, hi, 'query')
      const mid = lo + ((hi - lo) >> 1)
      rec.push(`拆成 [${lo},${mid}) 与 [${mid},${hi})，结果相加。`, F(node), ['querySplit'], { node, mid })
      return q(2 * node, lo, mid) + q(2 * node + 1, mid, hi)
    }
    const res = n > 0 ? q(1, 0, n) : 0
    answers.push({ op: label, value: res })
    rec.push(`${label} = ${res}。`, F(1, { result: res }), ['sumCall'], { l, r, result: res })
  }
  const result: LazyResult = { ok: true, total: [...total], lazy: [...lazy], values, answers }
  rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
  return { steps: rec.steps, result }
}
