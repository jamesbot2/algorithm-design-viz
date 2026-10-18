import type { Step } from '../../types/step'
import type { DsuView } from '../../types/advancedView'
import type { DsuInput, DsuOp } from '../../features/advanced/inputs'
import { Recorder } from './common'

export const meta = {
  id: 'dsu',
  title: '并查集 DSU（按大小合并 + 路径压缩）',
  complexity: '均摊 O(α(n)) / 操作，空间 O(n)',
  description: '维护若干不相交集合。find 返回代表元，union 按大小把小树挂到大树下，find 时把路径上的结点直接指向根。',
  implName: 'dsuBySizeCompress',
  implVersion: '1.0.0',
  docId: 'dsu.ts',
  defaultN: 8,
  defaultOps: 'union 0 1; union 2 3; union 0 2; find 3; union 4 5; union 6 7; union 4 6; union 0 4; same 3 7; union 1 7',
}

export interface DsuResult {
  ok: true
  components: number
  parent: number[]
  size: number[]
  answers: { op: string; value: number | boolean }[]
}

/** Traced run of the teaching variant in src/codeCatalog/dsu (same control flow, same tie rule). */
export function generateDsuSteps(input: DsuInput): { steps: Step[]; result: DsuResult } {
  const { n, ops } = input
  const parent = Array.from({ length: n }, (_, i) => i)
  const size = new Array<number>(n).fill(1)
  let count = n
  const rec = new Recorder(meta.docId)
  const answers: DsuResult['answers'] = []
  const view = (op: string, x: Partial<DsuView> = {}): DsuView => ({
    kind: 'dsu',
    n,
    parent: [...parent],
    size: [...size],
    components: count,
    op,
    ...x,
  })
  const v = (o: Record<string, string | number | boolean | null>) => ({
    components: count,
    parent: parent.join(','),
    size: size.join(','),
    ...o,
  })

  rec.push(
    `初始化：${n} 个元素各自成一个集合（parent[i]=i，size[i]=1）。`,
    view('init'),
    ['init'],
    v({ op: 'init' }),
  )

  /** traced find; returns root. `label` is the owning operation text. */
  const find = (x0: number, label: string): number => {
    let root = x0
    const path = [x0]
    rec.push(`find(${x0})：从 ${x0} 出发，沿 parent 向上找根。`, view(label, { findPath: [...path] }), ['findStart'], v({ op: label, x: x0 }))
    while (parent[root] !== root) {
      root = parent[root]!
      path.push(root)
      rec.push(
        `向上一步：到 ${root}（parent[${path[path.length - 2]}]=${root}）${parent[root] === root ? '，它的 parent 是自己 → 找到根' : ''}。`,
        view(label, { findPath: [...path], ...(parent[root] === root ? { root } : {}) }),
        ['findClimb'],
        v({ op: label, x: x0, cur: root }),
      )
    }
    if (path.length === 1) {
      rec.push(`${x0} 本身就是根，无需压缩。`, view(label, { findPath: [x0], root }), ['findClimb'], v({ op: label, x: x0, root }))
    }
    const toFix = path.slice(0, -1).filter((p) => parent[p] !== root)
    let x = x0
    const done: number[] = []
    while (parent[x] !== root) {
      const next = parent[x]!
      const old = parent[x]!
      parent[x] = root
      done.push(x)
      rec.push(
        `路径压缩：parent[${x}] 从 ${old} 改为根 ${root}。`,
        view(label, { findPath: [...path], root, compressed: [...done] }),
        ['compress'],
        v({ op: label, x: x0, node: x, root }),
      )
      x = next
    }
    void toFix
    rec.push(`find(${x0}) 返回根 ${root}。`, view(label, { findPath: [...path], root, compressed: [...done] }), ['findReturn'], v({ op: label, x: x0, root }))
    return root
  }

  for (const op of ops as DsuOp[]) {
    if (op.t === 'find') {
      const label = `find(${op.a})`
      const r = find(op.a, label)
      answers.push({ op: label, value: r })
    } else if (op.t === 'same') {
      const label = `same(${op.a},${op.b})`
      const ra = find(op.a, label)
      const rb = find(op.b, label)
      answers.push({ op: label, value: ra === rb })
      rec.push(
        `same(${op.a},${op.b})：根 ${ra} ${ra === rb ? '=' : '≠'} ${rb} → ${ra === rb ? '同一集合' : '不同集合'}（只查询，不合并）。`,
        view(label, { compare: [ra, rb] }),
        ['sameCompare'],
        v({ op: label, ra, rb, same: ra === rb }),
      )
    } else {
      const label = `union(${op.a},${op.b})`
      rec.push(`${label}：先分别找两端的根。`, view(label), ['unionFind'], v({ op: label }))
      let ra = find(op.a, label)
      let rb = find(op.b, label)
      if (ra === rb) {
        answers.push({ op: label, value: false })
        rec.push(
          `两个根都是 ${ra}：已在同一集合，不合并，集合数保持 ${count}。`,
          view(label, { compare: [ra, rb] }),
          ['unionSame'],
          v({ op: label, ra, rb, merged: false }),
        )
        continue
      }
      const swap = size[ra]! < size[rb]!
      if (swap) {
        ;[ra, rb] = [rb, ra]
      }
      rec.push(
        swap
          ? `比较 size：size[${rb}]=${size[rb]} < size[${ra}]=${size[ra]}，交换，让较大的树 ${ra} 做新根。`
          : `比较 size：size[${ra}]=${size[ra]} ≥ size[${rb}]=${size[rb]}，无需交换（相等时第二个根挂到第一个根下）。`,
        view(label, { compare: [ra, rb] }),
        ['unionSwap'],
        v({ op: label, big: ra, small: rb, swapped: swap }),
      )
      parent[rb] = ra
      size[ra]! += size[rb]!
      count--
      answers.push({ op: label, value: true })
      rec.push(
        `合并：parent[${rb}]=${ra}，size[${ra}]=${size[ra]}，集合数减为 ${count}。`,
        view(label, { link: { child: rb, parent: ra } }),
        ['unionLink'],
        v({ op: label, big: ra, small: rb, merged: true }),
      )
      rec.push(`${label} 完成（返回 true）。`, view(label, { link: { child: rb, parent: ra } }), ['unionDone'], v({ op: label, merged: true }))
    }
  }
  const result: DsuResult = { ok: true, components: count, parent: [...parent], size: [...size], answers }
  const last = rec.steps[rec.steps.length - 1]!
  rec.steps[rec.steps.length - 1] = { ...last, result }
  return { steps: rec.steps, result }
}
