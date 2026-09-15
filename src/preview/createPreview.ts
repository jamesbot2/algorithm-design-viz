/**
 * Pure ready-not-executed preview builders.
 * DO NOT call generateSteps(input)[0] — that builds a full trace.
 * Size-capped for demo safety.
 */
import type { Step } from '../types/step'
import type { GraphDraft } from '../core/graph/types'
import { DEMO_LIMITS } from '../utils/limits'

const CAP_ARRAY = Math.min(32, DEMO_LIMITS.arrayLen)
const CAP_STR = Math.min(24, DEMO_LIMITS.stringLen)
const CAP_N = 8
const CAP_GRAPH_N = Math.min(12, DEMO_LIMITS.graphN)

function capArr<T>(a: T[], n = CAP_ARRAY): T[] {
  return a.length > n ? a.slice(0, n) : a
}

export type PreviewKind =
  | 'array'
  | 'binarySearch'
  | 'dpMatrix'
  | 'graph'
  | 'nQueens'
  | 'knapsack'
  | 'strings'
  | 'generic'

export interface ArrayPreviewInput {
  arr: number[]
  label?: string
}

export interface BinarySearchPreviewInput {
  arr: number[]
  target: number
}

export interface DpMatrixPreviewInput {
  rows: number
  cols: number
  rowLabel?: string
  colLabel?: string
  name?: string
}

export interface GraphPreviewInput {
  draft: GraphDraft
}

export interface NQueensPreviewInput {
  n: number
}

export interface KnapsackPreviewInput {
  weights: number[]
  values: number[]
  capacity: number
}

export interface StringsPreviewInput {
  a: string
  b: string
  kind: 'lcs' | 'edit' | 'kmp'
}

/** Array with indices; ready, not executing. */
export function createArrayPreview(input: ArrayPreviewInput): Step {
  const a = capArr(input.arr)
  return {
    id: -1,
    message: '就绪：调整输入后点击「运行」开始执行。',
    arrays: { [input.label ?? 'a']: [...a] },
    highlights: { [input.label ?? 'a']: [] },
    vars: { ready: true, n: a.length },
    stats: {},
    phase: 'preview',
  }
}

/** Binary range: lo/hi only — no fake mid. */
export function createBinarySearchPreview(input: BinarySearchPreviewInput): Step {
  const a = capArr(input.arr)
  const lo = 0
  const hi = Math.max(-1, a.length - 1)
  const pointers: Record<string, number> = {}
  if (a.length > 0) {
    pointers.lo = lo
    pointers.hi = hi
  }
  return {
    id: -1,
    message: `就绪：二分查找 target=${input.target}（未执行；仅显示 lo/hi 区间）`,
    arrays: { a: [...a] },
    highlights: { a: [] },
    vars: { target: input.target, lo: a.length ? lo : null, hi: a.length ? hi : null, mid: null, ready: true },
    pointers: Object.keys(pointers).length ? pointers : undefined,
    arrayPointers: Object.keys(pointers).length ? { a: pointers } : undefined,
    stats: {},
    phase: 'preview',
    codeRefs: [{ documentId: 'binarySearch.ts', anchorId: 'init' }],
  }
}

/** DP empty table: null = unset (shown as ·), distinct from 0. */
export function createDpMatrixPreview(input: DpMatrixPreviewInput): Step {
  const rows = Math.min(Math.max(1, input.rows), CAP_N + 1)
  const cols = Math.min(Math.max(1, input.cols), CAP_N + 1)
  const name = input.name ?? 'dp'
  const mat: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  )
  // Boundary convention often 0 — leave unset so student sees empty before run
  return {
    id: -1,
    message: `就绪：${name} 表 ${rows}×${cols}（· = 未写入，区别于 0）`,
    matrices: { [name]: mat as unknown as number[][] },
    vars: {
      ready: true,
      rows,
      cols,
      ...(input.rowLabel ? { rowLabel: input.rowLabel } : {}),
      ...(input.colLabel ? { colLabel: input.colLabel } : {}),
    },
    stats: {},
    phase: 'preview',
    labelHints: {
      rows: input.rowLabel ? [input.rowLabel] : undefined,
      cols: input.colLabel ? [input.colLabel] : undefined,
    },
  }
}

/** Graph without result edges / path highlights. */
export function createGraphPreview(input: GraphPreviewInput): Step {
  const g = input.draft
  const n = Math.min(Math.max(0, g.n), CAP_GRAPH_N)
  const edges = (g.edges ?? []).slice(0, 48).filter(([u, v]) => u < n && v < n)
  const nodes = Array.from({ length: n }, (_, i) => ({ id: i, label: String(i) }))
  return {
    id: -1,
    message: `就绪：图 n=${n}，边 ${edges.length}（无结果边高亮）`,
    graph: {
      nodes,
      edges: edges.map(([u, v, w], i) => ({
        id: `e${i}-${u}-${v}`,
        from: u,
        to: v,
        weight: w,
        directed: g.directed,
      })),
      highlightNodes: typeof g.start === 'number' && g.start < n ? [g.start] : [],
      highlightEdgeIds: [],
      edgeRoles: {},
      nodeRoles:
        typeof g.start === 'number' && g.start < n
          ? { [String(g.start)]: 'source' as const }
          : {},
    },
    vars: { ready: true, n, start: g.start ?? 0, directed: Boolean(g.directed) },
    stats: {},
    phase: 'preview',
  }
}

/** Empty N-queens board. */
export function createNQueensPreview(input: NQueensPreviewInput): Step {
  const n = Math.min(Math.max(1, input.n), CAP_N)
  const board: (number | null)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  )
  return {
    id: -1,
    message: `就绪：${n}×${n} 空棋盘（未放置皇后）`,
    matrices: { board: board as unknown as number[][] },
    vars: { ready: true, n, queens: 0 },
    stats: {},
    phase: 'preview',
  }
}

/** Knapsack: show items as arrays; empty dp strip. */
export function createKnapsackPreview(input: KnapsackPreviewInput): Step {
  const weights = capArr(input.weights, 16)
  const values = capArr(input.values, 16)
  const W = Math.min(Math.max(0, input.capacity), 64)
  const dpRow: (number | null)[] = Array.from({ length: W + 1 }, () => null)
  return {
    id: -1,
    message: `就绪：n=${weights.length}，W=${W}（DP 未填）`,
    arrays: { weights: [...weights], values: [...values] },
    matrices: { dp: [dpRow as unknown as number[]] },
    vars: { ready: true, n: weights.length, capacity: W },
    stats: {},
    phase: 'preview',
  }
}

export function createStringsPreview(input: StringsPreviewInput): Step {
  const a = input.a.slice(0, CAP_STR)
  const b = input.b.slice(0, CAP_STR)
  if (input.kind === 'kmp') {
    return {
      id: -1,
      message: `就绪：文本「${a}」· 模式「${b}」`,
      arrays: {
        text: a.split(''),
        pattern: b.split(''),
      },
      vars: { ready: true, textLen: a.length, patternLen: b.length },
      stats: {},
      phase: 'preview',
    }
  }
  const rows = a.length + 1
  const cols = b.length + 1
  return createDpMatrixPreview({
    rows: Math.min(rows, CAP_N + 1),
    cols: Math.min(cols, CAP_N + 1),
    name: 'dp',
    rowLabel: a.slice(0, 12) || 'X',
    colLabel: b.slice(0, 12) || 'Y',
  })
}

/** Generic fallback when algo has no specialized preview. */
export function createGenericPreview(message?: string): Step {
  return {
    id: -1,
    message: message ?? '就绪：调整输入后点击「运行」开始可视化。',
    vars: { ready: true },
    stats: {},
    phase: 'preview',
  }
}

export function createPreviewForAlgo(
  algoId: string,
  draft: {
    arrayText?: string
    target?: string
    strA?: string
    strB?: string
    editA?: string
    editB?: string
    text?: string
    pattern?: string
    graph?: GraphDraft | null
    nQueensN?: string
    knapsackWeights?: string
    knapsackValues?: string
    knapsackW?: string
    matrixDims?: string
    huffmanSymbols?: string
    huffmanFreqs?: string
  },
): Step {
  const parseList = (s?: string) =>
    (s ?? '')
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n))

  const GRAPH = new Set([
    'bfs',
    'dijkstra',
    'dijkstraHeap',
    'kruskal',
    'prim',
    'bellmanFord',
    'floyd',
  ])

  if (algoId === 'binarySearch') {
    return createBinarySearchPreview({
      arr: parseList(draft.arrayText),
      target: Number(draft.target) || 0,
    })
  }
  if (algoId === 'lcs') {
    return createStringsPreview({ a: draft.strA ?? '', b: draft.strB ?? '', kind: 'lcs' })
  }
  if (algoId === 'editDistance') {
    return createStringsPreview({ a: draft.editA ?? '', b: draft.editB ?? '', kind: 'edit' })
  }
  if (algoId === 'kmp') {
    return createStringsPreview({ a: draft.text ?? '', b: draft.pattern ?? '', kind: 'kmp' })
  }
  if (algoId === 'nQueens') {
    return createNQueensPreview({ n: Number(draft.nQueensN) || 4 })
  }
  if (algoId === 'knapsack01') {
    return createKnapsackPreview({
      weights: parseList(draft.knapsackWeights),
      values: parseList(draft.knapsackValues),
      capacity: Number(draft.knapsackW) || 0,
    })
  }
  if (GRAPH.has(algoId) && draft.graph) {
    return createGraphPreview({ draft: draft.graph })
  }
  if (
    [
      'bubbleSort',
      'insertionSort',
      'mergeSort',
      'quickSort',
      'kadane',
      'maxSubarrayDC',
    ].includes(algoId)
  ) {
    return createArrayPreview({ arr: parseList(draft.arrayText) })
  }
  if (algoId === 'matrixChain') {
    const dims = parseList(draft.matrixDims)
    const n = Math.max(1, dims.length - 1)
    return createDpMatrixPreview({ rows: n + 1, cols: n + 1, name: 'm' })
  }
  if (algoId === 'huffman') {
    const syms = (draft.huffmanSymbols ?? '').split(/[,\s]+/).filter(Boolean)
    const freqs = parseList(draft.huffmanFreqs)
    return {
      id: -1,
      message: `就绪：Huffman n=${syms.length}`,
      arrays: { freqs: capArr(freqs) },
      vars: { ready: true, symbols: syms.slice(0, 16).join(',') },
      stats: {},
      phase: 'preview',
    }
  }
  return createGenericPreview()
}
