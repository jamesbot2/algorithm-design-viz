import type { SearchTreeNode, Step } from '../types/step'
import { snapshotTree } from '../utils/cloneTree'

export const meta = {
  id: 'nQueens',
  title: 'N 皇后',
  complexity: '时间指数级（回溯），空间 O(n)',
  description:
    '在 n×n 棋盘放置 n 个皇后使互不攻击。支持求一个解或枚举全部解；预算截断时不宣称完整计数。',
  code: `place(row):
  if row==n: record solution
  for col in 0..n-1:
    if safe: place; place(row+1); remove`,
  defaultN: 4,
  implName: 'nQueensBacktrack',
  implVersion: '1.2.0',
  timeComplexity: 'O(n!) 量级（剪枝后更少）',
  spaceComplexity: 'O(n)',
  inputAssumptions: 'n≥1；demo 默认求全部解；大 n 需提高 budget',
}

export type NQueensMode = 'one' | 'all'

export interface NQueensResult {
  ok: boolean
  n: number
  mode: NQueensMode
  solutionCount: number
  solutions: number[][]
  truncated: boolean
  complete: boolean
  btNodes?: number
  prunedNodes?: number
}

function isSafe(cols: number[], row: number, col: number): boolean {
  for (let r = 0; r < row; r++) {
    const c = cols[r]!
    if (c === col || Math.abs(c - col) === row - r) return false
  }
  return true
}

export function solveNQueens(
  n: number,
  mode: NQueensMode = 'all',
  budget = { maxNodes: 200_000, maxSolutions: 10_000 },
): { result: NQueensResult; steps: Step[]; tree: SearchTreeNode } {
  const solutions: number[][] = []
  let nodes = 0
  let prunedNodes = 0
  let truncated = false
  let sid = 0
  let frameSeq = 0
  const cols: number[] = Array(n).fill(-1)
  const root: SearchTreeNode = {
    id: 'nq-root',
    label: `N=${n}`,
    status: 'root',
    children: [],
  }
  const steps: Step[] = []
  let stepId = 0
  const DOC = 'nQueens.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]

  const boardSnap = (
    message: string,
    phase?: string,
    codeRefs?: { documentId: string; anchorId: string }[],
    frameId?: string,
  ) => {
    const board = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => (cols[r] === c ? 'Q' : '.')),
    )
    steps.push({
      id: stepId++,
      message,
      phase,
      frameId: frameId ?? `nq-f${frameSeq++}`,
      matrices: { board },
      searchTree: snapshotTree(root),
      vars: { n, solutions: solutions.length, nodes, truncated, prunedNodes, frameId: frameId ?? `nq-f${frameSeq - 1}` },
      stats: { comparisons: nodes, writes: prunedNodes },
      codeRefs,
    })
  }

  function dfs(row: number, parent: SearchTreeNode) {
    if (truncated) return
    if (nodes >= budget.maxNodes) {
      truncated = true
      return
    }
    nodes++
    if (steps.length < 120) {
      boardSnap(`递归进入 row=${row}`, 'call', ref('call'))
    }
    if (row === n) {
      solutions.push([...cols])
      parent.status = 'optimal'
      boardSnap(`找到解 #${solutions.length}: [${cols.join(', ')}]`, 'solution', ref('solution'))
      if (mode === 'one' || solutions.length >= budget.maxSolutions) {
        if (solutions.length >= budget.maxSolutions && mode === 'all') truncated = true
        return
      }
      return
    }
    for (let col = 0; col < n; col++) {
      if (truncated) return
      const node: SearchTreeNode = {
        id: `nq${sid++}`,
        label: `R${row}→C${col}`,
        status: 'exploring',
        children: [],
      }
      parent.children = parent.children ?? []
      parent.children.push(node)
      if (!isSafe(cols, row, col)) {
        node.status = 'rejected'
        prunedNodes++
        if (steps.length < 120) {
          boardSnap(`冲突：row=${row} col=${col}`, 'conflict', ref('conflict'))
        }
        continue
      }
      cols[row] = col
      if (steps.length < 80) boardSnap(`放置 row=${row} col=${col}`, 'place', ref('place'))
      if (steps.length < 120) boardSnap(`递归调用 row=${row + 1}`, 'recurse', ref('recurse'))
      dfs(row + 1, node)
      cols[row] = -1
      if (steps.length < 120) boardSnap(`回溯撤销 row=${row} col=${col}`, 'backtrack', ref('backtrack'))
      if (mode === 'one' && solutions.length >= 1) return
    }
  }

  boardSnap(`开始 N=${n} 皇后（mode=${mode}）`, 'init', ref('call'))
  dfs(0, root)

  const complete = !truncated
  const result: NQueensResult = {
    ok: true,
    n,
    mode,
    solutionCount: solutions.length,
    solutions,
    truncated,
    complete,
    btNodes: nodes,
    prunedNodes,
  }
  steps.push({
    id: stepId++,
    message: complete
      ? `完成：共 ${solutions.length} 个解`
      : `预算截断：已找到 ${solutions.length} 个解（不可当作完整计数）`,
    phase: 'done',
    frameId: `nq-f${frameSeq++}`,
    searchTree: snapshotTree(root),
    vars: {
      n,
      solutionCount: solutions.length,
      truncated,
      complete,
      btNodes: nodes,
      prunedNodes,
    },
    result,
    codeRefs: ref('solution'),
  })
  return { result, steps, tree: snapshotTree(root) }
}

export function generateSteps(_arr: number[], n = meta.defaultN, mode: NQueensMode = 'all'): Step[] {
  return solveNQueens(n, mode).steps
}
