import type { SearchTreeNode, Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'
import { snapshotTree } from '../../utils/cloneTree'

/** Fractional knapsack upper bound on remaining items (sorted by density). */
export function fractionalUpperBound(
  items: { weight: number; value: number }[],
  startIdx: number,
  remainCap: number,
  curValue: number,
): number {
  let bound = curValue
  let cap = remainCap
  // items from startIdx assumed sorted by value/weight desc
  for (let i = startIdx; i < items.length && cap > 0; i++) {
    const it = items[i]!
    if (it.weight <= cap) {
      cap -= it.weight
      bound += it.value
    } else {
      // fractional — float care: use exact fraction
      bound += (it.value * cap) / it.weight
      cap = 0
    }
  }
  return bound
}

export function solveBranchAndBound(inst: KnapsackInstance): {
  solution: KnapsackSolution
  steps: Step[]
  tree: SearchTreeNode
} {
  const sorted = [...inst.items]
    .map((it) => ({
      ...it,
      density: it.weight === 0 ? Infinity : it.value / it.weight,
    }))
    .sort((a, b) => b.density - a.density || a.id.localeCompare(b.id))

  let best = 0
  let bestIds: string[] = []
  let sid = 0
  const root: SearchTreeNode = {
    id: 'bb-root',
    label: 'B&B 根',
    status: 'root',
    children: [],
    meta: { bound: fractionalUpperBound(sorted, 0, inst.capacity, 0) },
  }

  function dfs(
    i: number,
    w: number,
    v: number,
    chosen: string[],
    parent: SearchTreeNode,
  ) {
    const bound = fractionalUpperBound(sorted, i, inst.capacity - w, v)
    if (bound < best - 1e-9) {
      const pruned: SearchTreeNode = {
        id: `p${sid++}`,
        label: `剪枝 bound=${bound.toFixed(2)} < best=${best}`,
        status: 'pruned',
        meta: { bound, best },
      }
      parent.children = parent.children ?? []
      parent.children.push(pruned)
      return
    }
    if (i === sorted.length) {
      if (v > best) {
        best = v
        bestIds = [...chosen]
      }
      return
    }
    const it = sorted[i]!
    // take
    if (w + it.weight <= inst.capacity) {
      const takeNode: SearchTreeNode = {
        id: `t${sid++}`,
        label: `选 ${it.id}`,
        status: 'exploring',
        children: [],
        meta: {
          v: v + it.value,
          bound: fractionalUpperBound(
            sorted,
            i + 1,
            inst.capacity - w - it.weight,
            v + it.value,
          ),
        },
      }
      parent.children = parent.children ?? []
      parent.children.push(takeNode)
      dfs(i + 1, w + it.weight, v + it.value, [...chosen, it.id], takeNode)
    }
    // skip
    const skipNode: SearchTreeNode = {
      id: `s${sid++}`,
      label: `跳过 ${it.id}`,
      status: 'exploring',
      children: [],
      meta: {
        v,
        bound: fractionalUpperBound(sorted, i + 1, inst.capacity - w, v),
      },
    }
    parent.children = parent.children ?? []
    parent.children.push(skipNode)
    dfs(i + 1, w, v, chosen, skipNode)
  }

  const steps: Step[] = [
    {
      id: 0,
      message: '开始分支限界',
      searchTree: snapshotTree(root),
      vars: { best: 0, note: 'fractional UB' },
    },
  ]

  dfs(0, 0, 0, [], root)

  const solution: KnapsackSolution = {
    ok: true,
    maxValue: best,
    selectedIds: bestIds,
    method: 'branchAndBound',
    note: '上界用分数背包（浮点）；找一个最优解',
  }
  steps.push({
    id: steps.length,
    message: `分支限界完成：最优值 ${best}（分数上界剪枝；注意 float）`,
    searchTree: snapshotTree(root),
    vars: { best, note: 'fractional UB' },
    result: solution,
  })
  return { solution, steps, tree: snapshotTree(root) }
}
