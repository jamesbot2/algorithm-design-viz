import type { Step } from '../../types/step'

export type StlLabId = 'stl-vector' | 'stl-deque' | 'stl-unique' | 'stl-set-map' | 'stl-string' | 'stl-numeric' | 'stl-comparator'
export interface LabOp {
  t: string
  n: number[]
  w: string[]
}
export type LabGrammar = Record<string, { args: ('i' | 'w')[]; lo?: number; hi?: number }>

/** Ids of the generic multi-row families (kept literal so AdvancedAlgoId stays a closed union). */
export type FamId = 'prefix-diff' | 'discretize' | 'bs-answer' | 'mono-stack' | 'mono-queue' | 'topo' | 'lca' | 'lis' | 'number-theory' | StlLabId

export type FamValue = number | number[] | string | LabOp[]
export type FamInput = Record<string, FamValue>

export interface FamField {
  key: string
  label: string
  kind: 'ints' | 'int' | 'ops' | 'word'
  /** kind 'ops': typed operation grammar (no eval, whitelisted names only) */
  grammar?: LabGrammar
  maxOps?: number
  min?: number
  max?: number
  minLen?: number
  maxLen?: number
}

export interface FamSpec {
  id: FamId
  meta: { id: string; title: string; complexity: string; description: string; implName: string; implVersion: string; docId: string }
  catalogId: string
  /** C++-only STL lab: built-in simulator + reference code */
  cppOnly?: boolean
  fields: FamField[]
  defaultDraft: Record<string, string>
  /** cross-field check on the typed input; returns a user-facing reason or null */
  check?: (i: FamInput) => { field: string; reason: string } | null
  generate: (i: FamInput) => { steps: Step[]; result: unknown }
  /** one-line "ready, not executed" message for the first frame */
  readyText: string
}
