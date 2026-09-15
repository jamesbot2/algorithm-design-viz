export interface GraphState {
  nodes: { id: string | number; label?: string; x?: number; y?: number }[]
  edges: {
    from: string | number
    to: string | number
    weight?: number
    directed?: boolean
  }[]
  highlightNodes?: (string | number)[]
  highlightEdges?: [string | number, string | number][]
}

/** Visual role for an array index highlight */
export type HighlightRole = 'compare' | 'swap' | 'sorted' | 'pivot' | 'read' | 'focus' | 'done'

export interface StepStats {
  comparisons?: number
  swaps?: number
  writes?: number
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
  /** Named index pointers shown under bars (i, j, mid, lo, hi, …) */
  pointers?: Record<string, number>
  /** Cumulative operation counters when the generator tracks them */
  stats?: StepStats
  codeLine?: number
  graph?: GraphState
}

/** Common var names that usually mean array indices */
export const INDEX_VAR_NAMES = [
  'i', 'j', 'k', 'mid', 'lo', 'hi', 'L', 'R', 'p', 'left', 'right', 'low', 'high', 'start', 'end',
] as const

/** Derive pointers from step.pointers or numeric index-like vars */
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
