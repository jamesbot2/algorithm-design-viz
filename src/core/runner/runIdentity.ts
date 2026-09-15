/**
 * Immutable async-run identity: captured at submit, never re-read from live page state.
 * Every async success/fail/progress/cancel/finally must check before writing UI.
 */

export type RunIdentity = Readonly<{
  /** Stable string id for this attempt (also used as worker runId). */
  runId: string
  /** Algo route id at submit time. */
  algoId: string
  /** Monotonic generation; bumped on replace-run / invalidate. */
  generation: number
  /** Frozen registry / graph input submitted with this run. */
  inputSnapshot: unknown
  /** Draft revision counter at submit (for dirty vs snapshot). */
  inputRevision: number
}>

export type ActiveRunSlot = {
  identity: RunIdentity | null
  /** Cooperative cancel for the active attempt. */
  cancelled: boolean
}

export function createRunIdString(generation: number): string {
  return `ui-${generation}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function makeRunIdentity(opts: {
  generation: number
  algoId: string
  inputSnapshot: unknown
  inputRevision: number
  runId?: string
}): RunIdentity {
  return Object.freeze({
    runId: opts.runId ?? createRunIdString(opts.generation),
    algoId: opts.algoId,
    generation: opts.generation,
    inputSnapshot: opts.inputSnapshot,
    inputRevision: opts.inputRevision,
  })
}

/** True iff `candidate` is still the active identity (same generation + runId + algoId). */
export function isRunCurrent(
  active: RunIdentity | null | undefined,
  candidate: RunIdentity | null | undefined,
): boolean {
  if (!active || !candidate) return false
  return (
    active.generation === candidate.generation &&
    active.runId === candidate.runId &&
    active.algoId === candidate.algoId
  )
}

/**
 * Compare draft field(s) relevant to a snapshot for dirty detection.
 * Uses JSON equality on frozen snapshots vs current draft slice.
 */
export function isDraftDirtyVersusSnapshot(
  currentSlice: unknown,
  snapshotInput: unknown,
): boolean {
  try {
    return JSON.stringify(currentSlice) !== JSON.stringify(snapshotInput)
  } catch {
    return true
  }
}
