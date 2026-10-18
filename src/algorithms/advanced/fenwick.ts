import type { Step } from '../../types/step'
import type { FenwickView } from '../../types/advancedView'
import type { RangeOperationsInput, RangeOp } from '../../features/advanced/inputs'
import { Recorder } from './common'

export const meta = {
  id: 'fenwick',
  title: '树状数组 Fenwick（单点加 + 前缀/区间和）',
  complexity: '单次操作 O(log n)，空间 O(n)',
  description: '内部 1-based：T[i] 管辖 (i−lowbit(i), i]。对外接口使用半开区间 [l,r)，下标 0-based。',
  implName: 'fenwickPointAddPrefixSum',
  implVersion: '1.0.0',
  docId: 'fenwick.ts',
  defaultN: 8,
  defaultOps: 'add 0 3; add 2 5; add 5 2; add 6 -1; prefix 6; range 2 6; add 3 4; range 0 8',
}

export const lowbit = (x: number) => x & -x

export interface FenwickResult {
  ok: true
  tree: number[]
  values: number[]
  answers: { op: string; value: number }[]
}

export function generateFenwickSteps(input: RangeOperationsInput): { steps: Step[]; result: FenwickResult } {
  const { n, ops } = input
  const tree = new Array<number>(n + 1).fill(0) // 1-based, [0] unused
  const values = new Array<number>(n).fill(0)
  const rec = new Recorder(meta.docId)
  const answers: FenwickResult['answers'] = []
  const view = (op: string, x: Partial<FenwickView> = {}): FenwickView => ({
    kind: 'fenwick',
    n,
    tree: tree.slice(1),
    values: [...values],
    op,
    path: [],
    ...x,
  })
  const bin = (x: number) => x.toString(2).padStart(Math.ceil(Math.log2(n + 1)) || 1, '0')

  rec.push(`初始化：长度 ${n} 的数组全为 0；内部树 T[1..${n}] 也全为 0。`, view('init'), ['init'], { n })

  const runOp = (op: RangeOp) => {
    if (op.t === 'add') {
      const label = `add(${op.i},${op.d})`
      values[op.i]! += op.d
      let p = op.i + 1
      const path: number[] = []
      rec.push(
        `${label}：对外下标 ${op.i}（0-based）→ 内部位置 p=${op.i}+1=${p}（1-based）。`,
        view(label, { node: p, path: [], direction: 'up' }),
        ['addStart'],
        { op: label, p },
      )
      while (p <= n) {
        path.push(p)
        const before = tree[p]!
        tree[p]! += op.d
        rec.push(
          `T[${p}] 管辖 (${p - lowbit(p)}, ${p}]，包含新位置：T[${p}] ${before} → ${tree[p]}（lowbit(${p})=${lowbit(p)}，二进制 ${bin(p)}）。`,
          view(label, { node: p, path: [...path], direction: 'up' }),
          ['addApply'],
          { op: label, p, lowbit: lowbit(p), before, after: tree[p]! },
        )
        const next = p + lowbit(p)
        rec.push(
          next <= n ? `p += lowbit(p)：${p} + ${lowbit(p)} = ${next}，继续向上。` : `p += lowbit(p)：${p} + ${lowbit(p)} = ${next} > n=${n}，结束。`,
          view(label, { node: p, path: [...path], direction: 'up' }),
          ['addNext'],
          { op: label, p, next },
        )
        p = next
      }
      return
    }
    const l = op.t === 'range' ? op.l : 0
    const r = op.r
    const label = op.t === 'range' ? `range(${l},${r})` : `prefix(${r})`
    const prefix = (rr: number, tag: string): number => {
      let s = 0
      let p = rr
      const path: number[] = []
      rec.push(
        `${tag}：求 [0,${rr}) 的和 → 内部 p=${rr}（正好是 1-based 前缀长度）。`,
        view(label, { node: p || undefined, path: [], direction: 'down', query: [0, rr], accum: 0 }),
        ['prefixStart'],
        { op: label, p, sum: 0 },
      )
      while (p > 0) {
        path.push(p)
        s += tree[p]!
        rec.push(
          `累加 T[${p}]=${tree[p]}（管辖 (${p - lowbit(p)}, ${p}]）：sum = ${s}。`,
          view(label, { node: p, path: [...path], direction: 'down', query: [0, rr], accum: s }),
          ['prefixAccum'],
          { op: label, p, lowbit: lowbit(p), sum: s },
        )
        const next = p - lowbit(p)
        rec.push(
          `p -= lowbit(p)：${p} − ${lowbit(p)} = ${next}${next === 0 ? '，到 0 结束' : '，继续向下'}。`,
          view(label, { node: p, path: [...path], direction: 'down', query: [0, rr], accum: s }),
          ['prefixNext'],
          { op: label, p, next },
        )
        p = next
      }
      rec.push(
        `${tag} = ${s}。`,
        view(label, { path: [...path], direction: 'down', query: [0, rr], accum: s, result: s }),
        ['prefixReturn'],
        { op: label, sum: s },
      )
      return s
    }
    if (op.t === 'prefix') {
      const s = prefix(r, label)
      answers.push({ op: label, value: s })
      return
    }
    const hi = prefix(r, `prefix(${r})`)
    const lo = prefix(l, `prefix(${l})`)
    const value = hi - lo
    answers.push({ op: label, value })
    rec.push(
      `range(${l},${r}) = prefix(${r}) − prefix(${l}) = ${hi} − ${lo} = ${value}（半开区间 [${l},${r})）。`,
      view(label, { query: [l, r], result: value, accum: value }),
      ['rangeCompute'],
      { op: label, hi, lo, result: value },
    )
  }
  for (const op of ops) runOp(op)
  const result: FenwickResult = { ok: true, tree: tree.slice(1), values: [...values], answers }
  const last = rec.steps[rec.steps.length - 1]!
  rec.steps[rec.steps.length - 1] = { ...last, result }
  return { steps: rec.steps, result }
}
