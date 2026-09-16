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
  implVersion: '1.3.0',
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
  computationComplete?: boolean
  traceComplete?: boolean
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

function makeBoard(n: number, cols: number[]): string[][] {
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (cols[r] === c ? 'Q' : '.')),
  )
}

export function solveNQueens(
  n: number,
  mode: NQueensMode = 'all',
  budget = { maxNodes: 200_000, maxSolutions: 10_000 },
  traceBudget = { maxSteps: 120, maxPlaceSteps: 80 },
): { result: NQueensResult; steps: Step[]; tree: SearchTreeNode } {
  const solutions: number[][] = []
  let nodes = 0
  let prunedNodes = 0
  let truncated = false
  let sid = 0
  let frameSeq = 0
  let stepsDropped = 0
  let traceSampled = false
  const cols: number[] = Array(n).fill(-1)
  /** Explicit active search path (node ids), never guessed from first exploring child. */
  const activePath: string[] = ['nq-root']
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
    extraVars?: Record<string, string | number | boolean | null>,
    force = false,
  ) => {
    const underCap =
      force ||
      steps.length < traceBudget.maxSteps ||
      (phase === 'place' && steps.filter((s) => s.phase === 'place').length < traceBudget.maxPlaceSteps)
    if (!underCap) {
      stepsDropped++
      traceSampled = true
      return
    }
    const board = makeBoard(n, cols)
    const pathIds = [...activePath]
    steps.push({
      id: stepId++,
      message,
      phase,
      frameId: `nq-f${frameSeq++}`,
      matrices: { board },
      searchTree: snapshotTree(root),
      vars: {
        n,
        solutions: solutions.length,
        nodes,
        truncated,
        prunedNodes,
        row: extraVars?.row ?? (cols.findIndex((c) => c < 0) >= 0 ? cols.findIndex((c) => c < 0) : n),
        activePathIds: pathIds.join(','),
        ...extraVars,
      },
      activePathIds: pathIds,
      stats: {},
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
    boardSnap(`递归进入 row=${row}`, 'call', ref('call'), { row })
    if (row === n) {
      solutions.push([...cols])
      parent.status = 'optimal'
      boardSnap(
        `找到解 #${solutions.length}: [${cols.join(', ')}]`,
        'solution',
        ref('solution'),
        { row: n, solutionIndex: solutions.length },
        true,
      )
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
        meta: { row, col },
      }
      parent.children = parent.children ?? []
      parent.children.push(node)
      if (!isSafe(cols, row, col)) {
        node.status = 'rejected'
        prunedNodes++
        boardSnap(`冲突：row=${row} col=${col}`, 'conflict', ref('conflict'), {
          row,
          col,
          conflicts: true,
        })
        continue
      }
      cols[row] = col
      activePath.push(node.id)
      boardSnap(`放置 row=${row} col=${col}`, 'place', ref('place'), { row, col, conflicts: false })
      boardSnap(`递归调用 row=${row + 1}`, 'recurse', ref('recurse'), { row: row + 1, col })
      dfs(row + 1, node)
      activePath.pop()
      cols[row] = -1
      node.status = node.status === 'optimal' ? 'optimal' : 'feasible'
      boardSnap(`回溯撤销 row=${row} col=${col}`, 'backtrack', ref('backtrack'), { row, col })
      if (mode === 'one' && solutions.length >= 1) return
    }
  }

  boardSnap(`开始 N=${n} 皇后（mode=${mode}）`, 'init', ref('call'), { row: 0 }, true)
  dfs(0, root)

  const computationComplete = !truncated
  const traceComplete = !traceSampled
  const result: NQueensResult = {
    ok: true,
    n,
    mode,
    solutionCount: solutions.length,
    solutions,
    truncated,
    complete: computationComplete,
    computationComplete,
    traceComplete,
    btNodes: nodes,
    prunedNodes,
  }
  const finalBoard =
    solutions.length > 0
      ? makeBoard(n, solutions[solutions.length - 1]!)
      : makeBoard(n, cols)
  const doneMsg = computationComplete
    ? traceComplete
      ? `完成：共 ${solutions.length} 个解`
      : `完成：共 ${solutions.length} 个解（轨迹已采样，省略 ${stepsDropped} 帧）`
    : `预算截断：已找到 ${solutions.length} 个解（不可当作完整计数）`
  steps.push({
    id: stepId++,
    message: doneMsg,
    phase: 'done',
    frameId: `nq-f${frameSeq++}`,
    matrices: { board: finalBoard },
    searchTree: snapshotTree(root),
    vars: {
      n,
      solutionCount: solutions.length,
      truncated,
      complete: computationComplete,
      computationComplete,
      traceComplete,
      traceSampled,
      stepsDropped,
      btNodes: nodes,
      prunedNodes,
      activePathIds: 'nq-root',
    },
    activePathIds: ['nq-root'],
    result,
    codeRefs: ref('done'),
  })
  return { result, steps, tree: snapshotTree(root) }
}

export function generateSteps(_arr: number[], n = meta.defaultN, mode: NQueensMode = 'all'): Step[] {
  return solveNQueens(n, mode).steps
}
