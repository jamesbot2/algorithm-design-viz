/** Shared graph draft used by GraphInput and validators. */
export type GraphAlgoId =
  | 'bfs'
  | 'dijkstra'
  | 'dijkstraHeap'
  | 'kruskal'
  | 'prim'
  | 'bellmanFord'
  | 'floyd'

export type EdgeTriple = [number, number, number]

export interface GraphDraft {
  n: number
  /** Edge list as u,v,w (0-based). For floyd, also convertible to matrix. */
  edges: EdgeTriple[]
  directed: boolean
  start: number
  /** Optional custom node labels; default 0..n-1 */
  nodeIds?: number[]
}

export interface GraphPreset {
  id: string
  label: string
  draft: GraphDraft
}

export interface GraphValidateOptions {
  algoId: GraphAlgoId
  maxN?: number
  maxEdges?: number
  /** Require non-negative weights (Dijkstra / Prim / Kruskal demo). */
  requireNonNegative?: boolean
  /** Allow negative (Bellman-Ford / Floyd). */
  allowNegative?: boolean
  /** Undirected algos: ignore directed flag mismatch with soft warning via issues. */
  expectUndirected?: boolean
  expectDirected?: boolean
  /** Need source vertex (BFS, Dijkstra, Prim, BF). */
  requireStart?: boolean
}

export type GraphIssue = { field: string; reason: string }
