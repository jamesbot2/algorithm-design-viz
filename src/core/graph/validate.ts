import { DEMO_LIMITS } from '../../utils/limits'
import type {
  EdgeTriple,
  GraphAlgoId,
  GraphDraft,
  GraphIssue,
  GraphValidateOptions,
} from './types'

export function algoGraphOptions(algoId: GraphAlgoId): GraphValidateOptions {
  switch (algoId) {
    case 'bfs':
      return {
        algoId,
        expectUndirected: true,
        requireStart: true,
        allowNegative: true, // weights ignored
      }
    case 'dijkstra':
    case 'dijkstraHeap':
      return {
        algoId,
        expectDirected: true,
        requireStart: true,
        requireNonNegative: true,
      }
    case 'kruskal':
      return { algoId, expectUndirected: true, requireNonNegative: true, requireStart: false }
    case 'prim':
      return {
        algoId,
        expectUndirected: true,
        requireStart: true,
        requireNonNegative: true,
      }
    case 'bellmanFord':
      return { algoId, expectDirected: true, requireStart: true, allowNegative: true }
    case 'floyd':
      return { algoId, expectDirected: true, requireStart: false, allowNegative: true }
    default:
      return { algoId }
  }
}

export function validateGraphDraft(
  raw: unknown,
  opts: GraphValidateOptions,
): { ok: true; value: GraphDraft } | { ok: false; issues: GraphIssue[] } {
  const issues: GraphIssue[] = []
  const maxN = opts.maxN ?? DEMO_LIMITS.graphN
  const maxEdges = opts.maxEdges ?? DEMO_LIMITS.edges

  if (!raw || typeof raw !== 'object') {
    return { ok: false, issues: [{ field: 'graph', reason: '须为对象' }] }
  }
  const r = raw as Partial<GraphDraft>
  const n = r.n
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
    issues.push({ field: 'n', reason: '须为正整数' })
  } else if (n > maxN) {
    issues.push({ field: 'n', reason: `超过演示上限 ${maxN}` })
  }

  if (!Array.isArray(r.edges)) {
    issues.push({ field: 'edges', reason: '须为边列表' })
  }

  if (issues.length) return { ok: false, issues }

  const nn = n as number
  const edges = r.edges as EdgeTriple[]
  if (edges.length > maxEdges) {
    return { ok: false, issues: [{ field: 'edges', reason: `边数超过上限 ${maxEdges}` }] }
  }

  const directed = Boolean(r.directed)
  const start = typeof r.start === 'number' ? r.start : 0

  if (opts.expectDirected && !directed) {
    issues.push({ field: 'directed', reason: `${opts.algoId} 约定有向图；请打开「有向」` })
  }
  if (opts.expectUndirected && directed) {
    issues.push({ field: 'directed', reason: `${opts.algoId} 约定无向图；请关闭「有向」` })
  }

  if (opts.requireStart !== false && opts.requireStart) {
    if (!Number.isInteger(start) || start < 0 || start >= nn) {
      issues.push({ field: 'start', reason: `源点须在 [0, ${nn - 1}]` })
    }
  } else if (opts.requireStart === false) {
    // floyd / kruskal: start optional
  } else if (Number.isInteger(start) && (start < 0 || start >= nn)) {
    issues.push({ field: 'start', reason: `源点须在 [0, ${nn - 1}]` })
  }

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]
    if (!Array.isArray(e) || e.length < 3) {
      issues.push({ field: 'edges', reason: `第 ${i + 1} 条边格式须为 u,v,w` })
      continue
    }
    const [u, v, w] = e
    if (!Number.isInteger(u) || !Number.isInteger(v)) {
      issues.push({ field: 'edges', reason: `第 ${i + 1} 条边端点须为整数` })
      continue
    }
    if (u < 0 || u >= nn || v < 0 || v >= nn) {
      issues.push({ field: 'edges', reason: `第 ${i + 1} 条边端点越界 (${u},${v})` })
    }
    if (typeof w !== 'number' || !Number.isFinite(w)) {
      issues.push({ field: 'edges', reason: `第 ${i + 1} 条边权须为有限数字` })
      continue
    }
    if (opts.requireNonNegative && w < 0) {
      issues.push({
        field: 'edges',
        reason: `第 ${i + 1} 条边权 ${w} < 0；${opts.algoId} 要求非负权`,
      })
    }
  }

  if (r.nodeIds) {
    if (!Array.isArray(r.nodeIds) || r.nodeIds.length !== nn) {
      issues.push({ field: 'nodeIds', reason: `nodeIds 长度须为 n=${nn}` })
    }
  }

  if (issues.length) return { ok: false, issues }

  return {
    ok: true,
    value: {
      n: nn,
      edges: edges.map(([u, v, w]) => [u, v, w] as EdgeTriple),
      directed,
      start: Number.isInteger(start) ? start : 0,
      nodeIds: r.nodeIds,
    },
  }
}

/** Parse edge list text: lines or commas of "u v w" / "u,v,w". */
export function parseEdgeListText(text: string): { ok: true; edges: EdgeTriple[] } | { ok: false; reason: string } {
  const edges: EdgeTriple[] = []
  const parts = text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const line of parts) {
    const nums = line.split(/[\s,]+/).filter(Boolean)
    if (nums.length < 2) {
      return { ok: false, reason: `无法解析边：${line}` }
    }
    const u = Number(nums[0])
    const v = Number(nums[1])
    const w = nums.length >= 3 ? Number(nums[2]) : 1
    if (![u, v, w].every((x) => Number.isFinite(x))) {
      return { ok: false, reason: `非数字边：${line}` }
    }
    if (!Number.isInteger(u) || !Number.isInteger(v)) {
      return { ok: false, reason: `端点须为整数：${line}` }
    }
    edges.push([u, v, w])
  }
  return { ok: true, edges }
}

export function edgesToAdj(edges: EdgeTriple[], n: number, directed: boolean): Record<number, number[]> {
  const adj: Record<number, number[]> = {}
  for (let i = 0; i < n; i++) adj[i] = []
  for (const [u, v] of edges) {
    if (!adj[u]!.includes(v)) adj[u]!.push(v)
    if (!directed && !adj[v]!.includes(u)) adj[v]!.push(u)
  }
  return adj
}

export function edgesToFloydMatrix(edges: EdgeTriple[], n: number): number[][] {
  const m = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
  )
  for (const [u, v, w] of edges) {
    if (w < m[u]![v]!) m[u]![v!] = w
  }
  return m
}

export function floydMatrixToEdges(matrix: number[][]): { n: number; edges: EdgeTriple[]; directed: true } {
  const n = matrix.length
  const edges: EdgeTriple[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const w = matrix[i]![j]!
      if (w !== Infinity && Number.isFinite(w)) edges.push([i, j, w])
    }
  }
  return { n, edges, directed: true }
}

/**
 * Parse a graph scalar field (n or start) from raw text.
 * Empty/whitespace → transient (not runnable), not a snap-back value.
 * Rejects non-finite, incomplete decimals that Number accepts oddly, Infinity, NaN text.
 * Does NOT silently trunc; integer check is explicit.
 */
export type GraphFieldParse =
  | { ok: true; value: number; transient?: false }
  | { ok: false; reason: string; transient?: boolean; value?: undefined }

export function parseGraphIntField(
  raw: string,
  field: 'n' | 'start',
  opts?: { allowEmptyTransient?: boolean },
): GraphFieldParse {
  const allowEmpty = opts?.allowEmptyTransient !== false
  const t = raw.trim()
  if (t === '') {
    if (allowEmpty) return { ok: false, reason: `请输入${field === 'n' ? '顶点数 n' : '源点'}`, transient: true }
    return { ok: false, reason: `${field} 不能为空` }
  }
  // Reject explicit non-finite tokens and scientific overflow text before Number()
  if (/^(nan|infinity|\+infinity|-infinity)$/i.test(t)) {
    return { ok: false, reason: `${field} 须为有限整数（收到「${t}」）` }
  }
  // Reject trailing junk / incomplete forms like "3." or "1e" that are not strict ints
  if (!/^[+-]?\d+$/.test(t)) {
    // Also catch 1e309 etc — not a plain integer literal
    return { ok: false, reason: `${field} 须为正整数的十进制写法（收到「${t}」）` }
  }
  const n = Number(t)
  if (!Number.isFinite(n)) {
    return { ok: false, reason: `${field} 非有限数字「${t}」` }
  }
  if (!Number.isInteger(n)) {
    return { ok: false, reason: `${field} 须为整数（禁止截断小数）` }
  }
  return { ok: true, value: n }
}
