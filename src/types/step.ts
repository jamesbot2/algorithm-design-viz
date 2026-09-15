export type EdgeRole = 'checking' | 'accepted' | 'rejected' | 'tree' | 'path' | 'relaxing'

export type NodeRole = 'current' | 'frontier' | 'settled' | 'source' | 'target' | 'neg-cycle'

export interface GraphEdge {
  /** Stable unique id for this edge instance (directed opposite edges differ). */
  id: string
  from: string | number
  to: string | number
  weight?: number
  directed?: boolean
}

export interface GraphState {
  nodes: { id: string | number; label?: string; x?: number; y?: number }[]
  edges: GraphEdge[]
  highlightNodes?: (string | number)[]
  /** @deprecated Prefer highlightEdgeIds + edgeRoles */
  highlightEdges?: [string | number, string | number][]
  highlightEdgeIds?: string[]
  edgeRoles?: Record<string, EdgeRole>
  /** Optional per-node visual roles (frontier / settled / …) */
  nodeRoles?: Record<string, NodeRole>
  /** Soft warning overlay e.g. negative_cycle — does not imply a valid SP */
  warning?: 'negative_cycle' | string
}

/** Visual role for an array index highlight */
export type HighlightRole =
  | 'compare'
  | 'swap'
  | 'sorted'
  | 'pivot'
  | 'read'
  | 'focus'
  | 'done'
  | 'update'
  | 'accepted'
  | 'rejected'
  | 'pruned'
  | 'optimal'

export interface StepStats {
  comparisons?: number
  swaps?: number
  writes?: number
}

export interface MatrixTarget {
  current?: [number, number]
  reads?: [number, number][]
  writes?: [number, number][]
  path?: [number, number][]
}

/** Inclusive index ranges for window algorithms (Kadane / max-subarray). */
export interface StepRanges {
  current?: [number, number]
  best?: [number, number]
}


/** Explicit array geometry op — do not infer swap from highlights.length >= 2 */
export type ArrayOpType = 'compare' | 'swap' | 'move' | 'copy' | 'write'

export interface ArrayOp {
  type: ArrayOpType
  indices: number[]
  /** Stable identity for duplicate values across swaps */
  elementIds?: string[]
}

export interface Step {
  id: number
  message: string
  /** Per-array list of highlighted indices (legacy; order still used as soft role hint) */
  highlights?: Record<string, number[]>
  /** Optional explicit roles per array name → index → role */
  roles?: Record<string, Record<number, HighlightRole>>
  arrays?: Record<string, number[] | string[]>
  matrices?: Record<string, (number | string | null)[][]>
  vars?: Record<string, string | number | boolean | null>
  /** Named index pointers shown under bars (i, j, mid, lo, hi, …) — legacy global */
  pointers?: Record<string, number>
  /**
   * Pointers scoped per array name → pointerName → index.
   * Preferred over global `pointers` when multiple arrays are shown.
   * Indexing is 0-based everywhere in viz unless a view explicitly labels otherwise.
   */
  arrayPointers?: Record<string, Record<string, number>>
  /**
   * Matrix cell highlights keyed by matrix name.
   * Prefer this over inferring from vars.i / vars.j (0 is a valid index).
   */
  matrixTargets?: Record<string, MatrixTarget>
  /** Cumulative operation counters when the generator tracks them */
  stats?: StepStats
  codeLine?: number
  graph?: GraphState
  /** Structured result on terminal / summary steps when practical */
  result?: unknown
  /** Optional backtracking / branch-and-bound search tree snapshot */
  searchTree?: SearchTreeNode
  /** Optional coarse phase marker for stage jump (init/extract/relax/done/…) */
  phase?: string
  /**
   * Explicit array ops keyed by array name. Prefer over inferring swap from highlights.
   * When a swap op is present, ArrayView animates real geometry swap; compare only highlights.
   */
  arrayOps?: Record<string, ArrayOp[]>
  /**
   * Stable element ids per array (same length as arrays[name]) for duplicate-value identity.
   * When omitted, ArrayView synthesizes ids from run+index.
   */
  elementIds?: Record<string, string[]>
  /** Code catalog refs emitted by generators at real ops — no message-to-line guessing */
  codeRefs?: { documentId: string; anchorId: string }[]
  ranges?: StepRanges
  /**
   * Optional row/col/item labels for matrix teaching sync
   * (e.g. knapsack items, LCS characters).
   */
  labelHints?: {
    rows?: string[]
    cols?: string[]
    items?: string[]
    /** Mark matrix as anti-example (wrong algorithm demo) */
    antiExample?: boolean
    antiNote?: string
  }
}

export interface SearchTreeNode {
  id: string
  label: string
  /** status for styling */
  status?: 'exploring' | 'pruned' | 'feasible' | 'optimal' | 'rejected' | 'root'
  children?: SearchTreeNode[]
  meta?: Record<string, string | number | boolean | null>
}


/** Common var names that usually mean array indices */
export const INDEX_VAR_NAMES = [
  'i', 'j', 'k', 'mid', 'lo', 'hi', 'L', 'R', 'p', 'left', 'right', 'low', 'high', 'start', 'end',
] as const

/** Derive pointers from step.pointers or numeric index-like vars (legacy global) */
export function derivePointers(step: Step): Record<string, number> {
  if (step.pointers && Object.keys(step.pointers).length > 0) {
    return { ...step.pointers }
  }
  const out: Record<string, number> = {}
  const vars = step.vars ?? {}
  for (const name of INDEX_VAR_NAMES) {
    const v = vars[name]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      out[name] = v
    }
  }
  return out
}

/**
 * Resolve pointers for a specific array.
 * Prefer arrayPointers[arrayName]; fall back to global pointers only when
 * there is a single array or the array is named "a".
 */
export function deriveArrayPointers(step: Step, arrayName: string): Record<string, number> {
  const scoped = step.arrayPointers?.[arrayName]
  if (scoped && Object.keys(scoped).length > 0) return { ...scoped }
  const arrayNames = step.arrays ? Object.keys(step.arrays) : []
  if (arrayNames.length <= 1 || arrayName === 'a') {
    return derivePointers(step)
  }
  return {}
}