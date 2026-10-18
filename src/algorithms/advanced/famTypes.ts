import type { Step } from '../../types/step'

/** Ids of the generic multi-row families (kept literal so AdvancedAlgoId stays a closed union). */
export type FamId = 'prefix-diff' | 'discretize' | 'bs-answer' | 'mono-stack' | 'mono-queue' | 'topo' | 'lca' | 'lis' | 'number-theory'

export type FamValue = number | number[]
export type FamInput = Record<string, FamValue>

export interface FamField {
  key: string
  label: string
  kind: 'ints' | 'int'
  min?: number
  max?: number
  minLen?: number
  maxLen?: number
}

export interface FamSpec {
  id: FamId
  meta: { id: string; title: string; complexity: string; description: string; implName: string; implVersion: string; docId: string }
  catalogId: string
  fields: FamField[]
  defaultDraft: Record<string, string>
  /** cross-field check on the typed input; returns a user-facing reason or null */
  check?: (i: FamInput) => { field: string; reason: string } | null
  generate: (i: FamInput) => { steps: Step[]; result: unknown }
  /** one-line "ready, not executed" message for the first frame */
  readyText: string
}
