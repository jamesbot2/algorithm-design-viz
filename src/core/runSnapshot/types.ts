/** Immutable record of a completed algorithm run (not the editable draft). */
export interface RunSnapshot {
  algoId: string
  /** Impl / scene protocol version for this run */
  version: number
  input: unknown
  params?: Record<string, unknown>
  seed: number
  sourceHash?: string
  runId: string
}

/** Share payload: run snapshot + playback cursor. Draft share is separate. */
export interface SceneShare {
  kind: 'run'
  snapshot: RunSnapshot
  stepIndex: number
}

export interface DraftShare {
  kind: 'draft'
  /** Clearly labeled non-run — may not match any executed trace */
  algoId: string
  draft: unknown
  params?: Record<string, unknown>
  label: 'draft-only-not-a-run'
}
