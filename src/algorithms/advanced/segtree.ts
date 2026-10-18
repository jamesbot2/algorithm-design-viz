import type { Step } from '../../types/step'
import type { SegView } from '../../types/advancedView'
import type { SegInput } from '../../features/advanced/inputs'
import { Recorder } from './common'

export const meta = {
  id: 'segtree',
  title: '线段树（单点赋值 + 区间和）',
  complexity: '建树 O(n)，单次 set / sum O(log n)，空间 O(n)',
  description: '递归线段树：结点 [lo,hi) 存区间和，对外接口半开区间 [l,r)，下标 0-based。',
  implName: 'segTreePointAssignRangeSum',
  implVersion: '1.0.0',
  docId: 'segtree.ts',
  defaultArr: '5, 3, 8, 1, 9, 2, 7, 4',
  defaultOps: 'sum 1 6; set 3 10; sum 0 4; sum 2 3; set 7 -2; sum 0 8',
}

export interface SegResult {
  ok: true
  tree: (number | null)[]
  values: number[]
  answers: { op: string; value: number }[]
  /** max heap-numbered node id used by the recursive layout for this n */
  maxNode: number
}

export const segSlots = (n: number) => 4 * Math.max(1, n)

/** Largest node id the recursive layout touches for length n (used by the "2n array is too small" counterexample). */
export function maxNodeId(n: number): number {
  let m = 0
  const go = (node: number, lo: number, hi: number) => {
    m = Math.max(m, node)
    if (hi - lo === 1) return
    const mid = lo + ((hi - lo) >> 1)
    go(2 * node, lo, mid)
    go(2 * node + 1, mid, hi)
  }
  if (n > 0) go(1, 0, n)
  return m
}

export function generateSegSteps(input: SegInput): { steps: Step[]; result: SegResult } {
  const { arr, ops } = input
  const n = arr.length
  const values = [...arr]
  const tree: (number | null)[] = new Array<number | null>(segSlots(n)).fill(null)
  const rec = new Recorder(meta.docId)
  const view = (op: string, extra: Partial<SegView> = {}): SegView => ({ kind: 'seg', n, tree: [...tree], op, visited: [], ...extra })
  const answers: SegResult['answers'] = []

  rec.push(`数组 a = [${arr.join(', ')}]，n=${n}。线段树还没有建：结点 [lo,hi) 将存 a[lo..hi) 的和。`, view('初始'), [], { n })

  const build = (node: number, lo: number, hi: number, visited: SegView['visited']) => {
    if (hi - lo === 1) {
      tree[node] = arr[lo]!
      visited.push({ node, role: 'leaf' })
      rec.push(`叶子 [${lo},${hi}) = a[${lo}] = ${arr[lo]}，tree[${node}] = ${arr[lo]}。`, view('建树', { node, visited: [...visited] }), ['buildLeaf'], { node, lo, hi })
      return
    }
    const mid = lo + ((hi - lo) >> 1)
    build(2 * node, lo, mid, visited)
    build(2 * node + 1, mid, hi, visited)
    tree[node] = tree[2 * node]! + tree[2 * node + 1]!
    visited.push({ node, role: 'split' })
    rec.push(
      `结点 ${node} 管辖 [${lo},${hi})：tree[${node}] = tree[${2 * node}] + tree[${2 * node + 1}] = ${tree[2 * node]} + ${tree[2 * node + 1]} = ${tree[node]}。`,
      view('建树', { node, visited: [...visited] }),
      ['buildPull'],
      { node, lo, hi, sum: tree[node]! },
    )
  }
  if (n > 0) {
    const vis: SegView['visited'] = []
    rec.push('从根结点 [0,n) 开始递归建树。', view('建树', { node: 1, visited: [] }), ['buildCall'], { n })
    build(1, 0, n, vis)
  }

  const setRec = (node: number, lo: number, hi: number, i: number, v: number, label: string, visited: SegView['visited']) => {
    if (hi - lo === 1) {
      const before = tree[node]!
      tree[node] = v
      values[i] = v
      visited.push({ node, role: 'leaf' })
      rec.push(`到达叶子 [${lo},${hi})：tree[${node}] ${before} → ${v}。`, view(label, { node, visited: [...visited], target: { index: i, value: v } }), ['setLeaf'], { node, before, after: v })
      return
    }
    const mid = lo + ((hi - lo) >> 1)
    visited.push({ node, role: 'path' })
    rec.push(
      `结点 ${node} 管辖 [${lo},${hi})，mid=${mid}：i=${i} ${i < mid ? `< ${mid} → 左孩子 ${2 * node}` : `≥ ${mid} → 右孩子 ${2 * node + 1}`}。`,
      view(label, { node, visited: [...visited], target: { index: i, value: v } }),
      ['setDescend'],
      { node, lo, hi, mid, goLeft: i < mid },
    )
    if (i < mid) setRec(2 * node, lo, mid, i, v, label, visited)
    else setRec(2 * node + 1, mid, hi, i, v, label, visited)
    const before = tree[node]!
    tree[node] = tree[2 * node]! + tree[2 * node + 1]!
    rec.push(
      `回溯到结点 ${node}：重算 tree[${node}] = ${tree[2 * node]} + ${tree[2 * node + 1]} = ${tree[node]}（原 ${before}）。`,
      view(label, { node, visited: [...visited], target: { index: i, value: v } }),
      ['setPull'],
      { node, before, after: tree[node]! },
    )
  }

  for (const op of ops) {
    if (op.t === 'set') {
      const label = `set(${op.i}, ${op.v})`
      const vis: SegView['visited'] = []
      rec.push(`${label}：set 调用 setRec(1, 0, ${n}, ${op.i}, ${op.v})。`, view(label, { node: 1, visited: [], target: { index: op.i, value: op.v } }), ['setCall'], { i: op.i, v: op.v })
      setRec(1, 0, n, op.i, op.v, label, vis)
      continue
    }
    const { l, r } = op
    const label = `sum(${l}, ${r})`
    const vis: SegView['visited'] = []
    let acc = 0
    rec.push(`${label}：区间 [${l},${r}) 的和，调用 query(1, 0, ${n}, ${l}, ${r})。`, view(label, { node: 1, visited: [], query: [l, r], accum: 0 }), ['sumCall'], { l, r })
    const query = (node: number, lo: number, hi: number): number => {
      if (r <= lo || hi <= l) {
        vis.push({ node, role: 'outside' })
        rec.push(`结点 ${node} 管辖 [${lo},${hi}) 与 [${l},${r}) 不相交 → 返回 0。`, view(label, { node, visited: [...vis], query: [l, r], accum: acc }), ['queryOutside'], { node, lo, hi })
        return 0
      }
      if (l <= lo && hi <= r) {
        vis.push({ node, role: 'inside' })
        acc += tree[node]!
        rec.push(`结点 ${node} 管辖 [${lo},${hi}) 完全落在 [${l},${r}) 内 → 返回 tree[${node}] = ${tree[node]}（累计 ${acc}）。`, view(label, { node, visited: [...vis], query: [l, r], accum: acc }), ['queryInside'], { node, lo, hi, value: tree[node]!, acc })
        return tree[node]!
      }
      const mid = lo + ((hi - lo) >> 1)
      vis.push({ node, role: 'split' })
      rec.push(`结点 ${node} 管辖 [${lo},${hi}) 与 [${l},${r}) 部分重叠 → 拆成 [${lo},${mid}) 与 [${mid},${hi})，结果相加。`, view(label, { node, visited: [...vis], query: [l, r], accum: acc }), ['querySplit'], { node, lo, hi, mid })
      return query(2 * node, lo, mid) + query(2 * node + 1, mid, hi)
    }
    const total = n > 0 ? query(1, 0, n) : 0
    answers.push({ op: label, value: total })
    rec.push(`${label} = ${total}（半开区间 [${l},${r})）。`, view(label, { node: 1, visited: [...vis], query: [l, r], accum: acc, result: total }), ['sumCall'], { l, r, result: total })
  }
  const result: SegResult = { ok: true, tree: [...tree], values, answers, maxNode: maxNodeId(n) }
  rec.steps[rec.steps.length - 1] = { ...rec.steps[rec.steps.length - 1]!, result }
  return { steps: rec.steps, result }
}
