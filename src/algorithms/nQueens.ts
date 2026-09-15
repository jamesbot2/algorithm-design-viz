import type { SearchTreeNode, Step } from '../types/step'

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
  implVersion: '1.0.0',
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
  let truncated = false
  let sid = 0
  const cols: number[] = Array(n).fill(-1)
  const root: SearchTreeNode = {
    id: 'nq-root',
    label: `N=${n}`,
    status: 'root',
    children: [],
  }
  const steps: Step[] = []
  let stepId = 0

  const boardSnap = (message: string, tree?: SearchTreeNode) => {
    const board = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => (cols[r] === c ? 'Q' : '.')),
    )
    steps.push({
      id: stepId++,
      message,
      matrices: { board },
      searchTree: tree ?? root,
      vars: { n, solutions: solutions.length, nodes, truncated },
    })
  }

  function dfs(row: number, parent: SearchTreeNode) {
    if (truncated) return
    if (nodes >= budget.maxNodes) {
      truncated = true
      return
    }
    nodes++
    if (row === n) {
      solutions.push([...cols])
      parent.status = 'optimal'
      boardSnap(`找到解 #${solutions.length}: [${cols.join(', ')}]`)
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
        continue
      }
      cols[row] = col
      if (steps.length < 80) boardSnap(`放置 row=${row} col=${col}`, root)
      dfs(row + 1, node)
      cols[row] = -1
      if (mode === 'one' && solutions.length >= 1) return
    }
  }

  boardSnap(`开始 N=${n} 皇后（mode=${mode}）`)
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
  }
  steps.push({
    id: stepId++,
    message: complete
      ? `完成：共 ${solutions.length} 个解`
      : `预算截断：已找到 ${solutions.length} 个解（不可当作完整计数）`,
    searchTree: root,
    vars: {
      n,
      solutionCount: solutions.length,
      truncated,
      complete,
    },
    result,
  })
  return { result, steps, tree: root }
}

export function generateSteps(_arr: number[], n = meta.defaultN, mode: NQueensMode = 'all'): Step[] {
  return solveNQueens(n, mode).steps
}
