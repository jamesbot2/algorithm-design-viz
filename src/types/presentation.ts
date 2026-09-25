/**
 * V24 presentation contract — declared per algorithm module (`export const presentation`).
 *
 * It decides ONLY how a frame is presented (which object is the stage's teaching
 * primary, which companions sit next to it, which auxiliaries are switchable).
 * It never changes the trace, the solver, the result or the playback cursor.
 * Modules without a descriptor keep the legacy inference (graph → board → matrix →
 * array → tree) so simple views stay compatible.
 */
export type PrimaryKind = 'array' | 'matrix' | 'graph' | 'board' | 'forest' | 'search-tree'

export interface AuxiliaryView {
  /** recursion-tree / search-tree come from step.searchTree */
  id: 'recursion-tree' | 'search-tree'
  label: string
  /** Auxiliaries are closed by default; the learner opens them explicitly. */
  defaultOpen?: boolean
}

export interface PresentationDescriptor {
  primaryKind: PrimaryKind
  /** Array / matrix name that IS the primary (e.g. merge sort `a`). */
  primaryKey?: string
  /**
   * Arrays that are required compact companions of the primary for the frames
   * that carry them (merge `left/right`, insertion `temp/key`, activity `selected`).
   */
  companions?: string[]
  /**
   * Reserve the companion strip on every frame (placeholder when a frame carries
   * no companion) so the primary's drawing area never jumps between frames.
   */
  reserveCompanions?: boolean
  /** Arrays shown as a compact input table next to a non-array primary (Huffman symbols/freqs). */
  inputTable?: string[]
  /** Switchable auxiliaries — never stuffed into the primary's drawing area. */
  auxiliaries?: AuxiliaryView[]
  /** Var holding the full call stack, summarised in the aux bar (full text stays in current data). */
  callStackVar?: string
  /** Per-array label presentation (e.g. interval labels as two-line id + [start,finish) cards). */
  labelFormat?: Record<string, 'interval-card'>
}
