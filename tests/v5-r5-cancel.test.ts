import { describe, expect, it, vi } from 'vitest'
import { createCancelFlag, runAlgo } from '../src/core/runner'
import { runAlgoAsync } from '../src/core/runner/asyncRun'
import type { Step } from '../src/types/step'

function heavySolve(cancel: { cancelled: boolean }, chunks = 40): { steps: Step[]; result: unknown; status?: 'cancelled' } {
  const steps: Step[] = []
  for (let i = 0; i < chunks; i++) {
    if (cancel.cancelled) return { steps, result: { ok: false }, status: 'cancelled' }
    steps.push({ id: i, message: `chunk ${i}` })
  }
  return { steps, result: { ok: true, n: chunks } }
}

describe('V5 R5 real cancel', () => {
  it('cancel during long task yields cancelled without late write-back (sync cooperative)', () => {
    const cancel = createCancelFlag()
    let wrote = false
    const outcome = runAlgo({
      algoId: 'heavy',
      validate: () => ({ ok: true as const, value: {} }),
      solve: (_input, ctx) => {
        cancel.cancelled = true // simulate mid-run cancel
        const r = heavySolve(ctx.cancel, 100)
        if (r.status !== 'cancelled') wrote = true
        return r
      },
      rawInput: {},
      cancel,
    })
    expect(outcome.status).toBe('cancelled')
    expect(outcome.cancelled).toBe(true)
    expect(wrote).toBe(false)
  })

  it('async run: cancel aborts; stale runId does not write back', async () => {
    const cancel = createCancelFlag()
    const writes: string[] = []
    const p = runAlgoAsync({
      algoId: 'heavy-async',
      validate: () => ({ ok: true as const, value: {} }),
      solveAsync: async (_input, ctx) => {
        const steps: Step[] = []
        for (let i = 0; i < 200; i++) {
          if (ctx.cancel.cancelled) {
            return { steps, result: { ok: false }, status: 'cancelled' as const }
          }
          steps.push({ id: i, message: `t${i}` })
          if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0))
        }
        return { steps, result: { ok: true } }
      },
      rawInput: {},
      cancel,
      runId: 'run-A',
      onComplete: (outcome, meta) => {
        writes.push(`${meta.runId}:${outcome.status}`)
      },
    })
    // cancel quickly
    cancel.cancelled = true
    const outcome = await p
    expect(outcome.status).toBe('cancelled')

    // stale guard: completing with old runId should not call onComplete if superseded
    const cancel2 = createCancelFlag()
    let late = false
    const ctrl = { acceptedRunId: 'run-new' }
    await runAlgoAsync({
      algoId: 'heavy-async',
      validate: () => ({ ok: true as const, value: {} }),
      solveAsync: async () => {
        await new Promise((r) => setTimeout(r, 5))
        return { steps: [{ id: 0, message: 'late' }], result: { ok: true } }
      },
      rawInput: {},
      cancel: cancel2,
      runId: 'run-old',
      isStale: (runId) => runId !== ctrl.acceptedRunId,
      onComplete: () => {
        late = true
      },
    })
    expect(late).toBe(false)
  })

  it('budget checked while recording not only post-slice', async () => {
    const cancel = createCancelFlag()
    let recorded = 0
    const outcome = await runAlgoAsync({
      algoId: 'budget',
      validate: () => ({ ok: true as const, value: {} }),
      solveAsync: async (_input, ctx) => {
        const steps: Step[] = []
        for (let i = 0; i < 500; i++) {
          if (ctx.budget.maxSteps !== undefined && steps.length >= ctx.budget.maxSteps) {
            return { steps, result: { ok: true, truncated: true }, status: 'ok' as const }
          }
          if (ctx.cancel.cancelled) return { steps, result: {}, status: 'cancelled' as const }
          steps.push({ id: i, message: `${i}` })
          recorded = steps.length
        }
        return { steps, result: { ok: true } }
      },
      rawInput: {},
      cancel,
      budget: { maxSteps: 25 },
    })
    expect(recorded).toBeLessThanOrEqual(25)
    expect((outcome.steps?.length ?? 0)).toBeLessThanOrEqual(25)
  })
})
