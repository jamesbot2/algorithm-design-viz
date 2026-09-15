import type { SearchTreeNode, Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'
import { snapshotTree } from '../../utils/cloneTree'

export function solveBacktracking(
  inst: KnapsackInstance,
  opts?: { maxNodes?: number },
): { solution: KnapsackSolution; steps: Step[]; tree: SearchTreeNode } {
  const maxNodes = opts?.maxNodes ?? 500
  const { items, capacity } = inst
  let best = 0
  let bestIds: string[] = []
  let nodeCount = 0
  let truncated = false
  let sid = 0
  const steps: Step[] = []

  const root: SearchTreeNode = {
    id: 'root',
    label: '∅',
    status: 'root',
    children: [],
    meta: { value: 0, weight: 0 },
  }

  function dfs(
    i: number,
    w: number,
    v: number,
    chosen: string[],
    parent: SearchTreeNode,
  ) {
    if (nodeCount >= maxNodes) {
      truncated = true
      return
    }
    nodeCount++
    if (i === items.length) {
      if (v > best) {
        best = v
        bestIds = [...chosen]
      }
      parent.status = v === best ? 'feasible' : 'feasible'
      return
    }
    const it = items[i]!
    // skip
    const skipNode: SearchTreeNode = {
      id: `n${sid++}`,
      label: `跳过 ${it.id}`,
      status: 'exploring',
      children: [],
      meta: { i, w, v },
    }
    parent.children = parent.children ?? []
    parent.children.push(skipNode)
    dfs(i + 1, w, v, chosen, skipNode)

    // take
    if (w + it.weight <= capacity) {
      const takeNode: SearchTreeNode = {
        id: `n${sid++}`,
        label: `选 ${it.id}`,
        status: 'exploring',
        children: [],
        meta: { i, w: w + it.weight, v: v + it.value },
      }
      parent.children.push(takeNode)
      dfs(i + 1, w + it.weight, v + it.value, [...chosen, it.id], takeNode)
    } else {
      const rej: SearchTreeNode = {
        id: `n${sid++}`,
        label: `不可选 ${it.id}（超重）`,
        status: 'rejected',
        meta: { i, w, need: it.weight },
      }
      parent.children!.push(rej)
      nodeCount++
    }
  }

  steps.push({
    id: steps.length,
    message: '开始回溯',
    searchTree: snapshotTree(root),
    vars: { best: 0, nodes: 0, truncated: false },
  })

  dfs(0, 0, 0, [], root)
  // mark best path loosely
  markOptimal(root, new Set(bestIds))

  const solution: KnapsackSolution = {
    ok: true,
    maxValue: best,
    selectedIds: bestIds,
    method: 'backtracking',
    truncated,
    note: truncated ? `搜索节点达上限 ${maxNodes}` : undefined,
  }
  steps.push({
    id: steps.length,
    message: truncated
      ? `回溯搜索（截断）：目前最佳 ${best}`
      : `回溯完成：最优值 ${best}，选中 [${bestIds.join(', ')}]`,
    searchTree: snapshotTree(root),
    vars: { best, nodes: nodeCount, truncated },
    result: solution,
  })
  return { solution, steps, tree: snapshotTree(root) }
}

function markOptimal(node: SearchTreeNode, ids: Set<string>) {
  if (node.label.startsWith('选 ')) {
    const id = node.label.slice(2)
    if (ids.has(id)) node.status = 'optimal'
  }
  for (const c of node.children ?? []) markOptimal(c, ids)
}
