import type { Step } from '../../types/step'
import type { Trace, ValidateResult } from '../trace/types'
import { TRACE_PROTOCOL_VERSION } from '../trace/types'
import { freezeSteps } from '../snapshot/freeze'
import type { CancelFlag, RunBudget, RunOutcome } from './types'

export interface RunAlgoOptions<TInput, TResult> {
  algoId: string
  implName?: string
  implVersion?: string
  validate: (raw: unknown) => ValidateResult<TInput>
  solve: (input: TInput, ctx: { cancel: CancelFlag; budget: RunBudget }) => {
    steps: Step[]
    result: TResult
    status?: Trace['status']
  }
  rawInput: unknown
  budget?: RunBudget
  cancel?: CancelFlag
  freeze?: boolean
}

/**
 * Run a typed algorithm with size budget + basic cancel flag.
 * Cancel is cooperative: checked before solve and after; generators that poll cancel mid-run
 * can return early (status cancelled).
 */
export function runAlgo<TInput, TResult = unknown>(
  opts: RunAlgoOptions<TInput, TResult>,
): RunOutcome<TResult> {
  const cancel = opts.cancel ?? { cancelled: false }
  const budget = opts.budget ?? {}

  if (cancel.cancelled) {
    return {
      status: 'cancelled',
      cancelled: true,
      errors: [{ message: '已取消', code: 'cancelled' }],
    }
  }

  const validated = opts.validate(opts.rawInput)
  if (!validated.ok) {
    return {
      status: 'validation_error',
      errors: validated.issues,
      trace: {
        protocolVersion: TRACE_PROTOCOL_VERSION,
        algoId: opts.algoId,
        implName: opts.implName,
        implVersion: opts.implVersion,
        status: 'validation_error',
        steps: [],
        result: { ok: false, code: 'validation_error', data: validated.issues },
        inputSnapshot: opts.rawInput,
      },
    }
  }

  if (
    budget.maxInputSize !== undefined &&
    budget.inputSize !== undefined &&
    budget.inputSize > budget.maxInputSize
  ) {
    return {
      status: 'budget_exceeded',
      errors: [
        {
          message: `输入规模 ${budget.inputSize} 超过预算 ${budget.maxInputSize}`,
          code: 'budget_exceeded',
        },
      ],
    }
  }

  try {
    const { steps, result, status } = opts.solve(validated.value, { cancel, budget })
    if (cancel.cancelled || status === 'cancelled') {
      const frozen = opts.freeze === false ? steps : ([...freezeSteps(steps)] as Step[])
      return {
        status: 'cancelled',
        cancelled: true,
        steps: frozen,
        result,
        trace: {
          protocolVersion: TRACE_PROTOCOL_VERSION,
          algoId: opts.algoId,
          implName: opts.implName,
          implVersion: opts.implVersion,
          status: 'cancelled',
          steps: frozen,
          result: { ok: false, code: 'cancelled', data: result },
          inputSnapshot: validated.value,
        },
      }
    }

    let outSteps = steps
    let truncated = false
    if (budget.maxSteps !== undefined && outSteps.length > budget.maxSteps) {
      outSteps = outSteps.slice(0, budget.maxSteps)
      truncated = true
    }

    const frozen = opts.freeze === false ? outSteps : ([...freezeSteps(outSteps)] as Step[])
    const runStatus =
      truncated && status !== 'algorithm_error' ? 'ok' : (status ?? 'ok')

    const trace: Trace = {
      protocolVersion: TRACE_PROTOCOL_VERSION,
      algoId: opts.algoId,
      implName: opts.implName,
      implVersion: opts.implVersion,
      status: runStatus === 'ok' || runStatus === undefined ? 'ok' : runStatus,
      steps: frozen,
      result:
        result && typeof result === 'object' && 'ok' in (result as object)
          ? {
              ok: Boolean((result as unknown as { ok: boolean }).ok),
              data: result,
            }
          : { ok: true, data: result },
      inputSnapshot: validated.value,
    }

    return {
      status: truncated ? 'budget_exceeded' : runStatus === 'algorithm_error' ? 'algorithm_error' : 'ok',
      result,
      steps: frozen,
      trace,
      truncated,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      status: 'algorithm_error',
      errors: [{ message, code: 'algorithm_error' }],
      trace: {
        protocolVersion: TRACE_PROTOCOL_VERSION,
        algoId: opts.algoId,
        status: 'algorithm_error',
        steps: [],
        result: { ok: false, code: 'algorithm_error', message },
      },
    }
  }
}

export function createCancelFlag(): CancelFlag {
  return { cancelled: false }
}
