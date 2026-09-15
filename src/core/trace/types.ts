import type { Step } from '../../types/step'

/** Protocol version for typed algorithm traces (M1). */
export const TRACE_PROTOCOL_VERSION = 1 as const

export type RunStatus =
  | 'ok'
  | 'validation_error'
  | 'algorithm_error'
  | 'unsupported'
  | 'cancelled'

export interface AlgoResult {
  ok: boolean
  /** Machine-readable code e.g. negative_weight, unsorted */
  code?: string
  /** Human-readable summary */
  message?: string
  /** Algorithm-specific payload */
  data?: unknown
}

export interface Trace {
  protocolVersion: typeof TRACE_PROTOCOL_VERSION
  algoId: string
  implName?: string
  implVersion?: string
  runId?: string
  status: RunStatus
  steps: Step[]
  result?: AlgoResult
  /** Snapshot of validated input used for this run */
  inputSnapshot?: unknown
}

export interface ValidationIssue {
  field: string
  position?: number
  reason: string
  token?: string
}

export interface ValidateOk<T> {
  ok: true
  value: T
}

export interface ValidateErr {
  ok: false
  issues: ValidationIssue[]
}

export type ValidateResult<T> = ValidateOk<T> | ValidateErr

export interface TypedAlgoModule<TInput, TResult = unknown> {
  id: string
  meta: {
    id: string
    title: string
    implName?: string
    implVersion?: string
    [key: string]: unknown
  }
  validate: (raw: unknown) => ValidateResult<TInput>
  solve: (input: TInput) => { trace: Trace; result: TResult }
  /** Adapter for legacy Visualizer / AlgoPage */
  generateSteps: (...args: never[]) => Step[]
}
