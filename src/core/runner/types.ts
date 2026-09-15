import type { Step } from '../../types/step'
import type { Trace, ValidationIssue } from '../trace/types'

export type RunOutcomeStatus =
  | 'ok'
  | 'validation_error'
  | 'algorithm_error'
  | 'budget_exceeded'
  | 'cancelled'
  | 'unsupported'

export interface RunBudget {
  /** Max steps to retain (generator may still compute more unless cooperative). */
  maxSteps?: number
  /** Soft input-size hint (e.g. n, n*W); checked before run when provided. */
  maxInputSize?: number
  /** Measured size of this run's input. */
  inputSize?: number
}

export interface CancelFlag {
  cancelled: boolean
}

export interface RunOutcome<TResult = unknown> {
  status: RunOutcomeStatus
  result?: TResult
  steps?: Step[]
  trace?: Trace
  errors?: ValidationIssue[] | { message: string; code?: string }[]
  truncated?: boolean
  cancelled?: boolean
}
