import { describe, expect, it, vi } from 'vitest'
import { createCancelFlag } from '../src/core/runner'
import { runHeavyPreferWorker, runHeavyCancelable } from '../src/core/runner/runHeavy'
import type { Step } from '../src/types/step'

describe('V5 M4 worker / chunked heavy path', () => {
  it('chunked fallback works and cancel terminates early', async () => {
    const cancel = createCancelFlag()
    const gen = () => {
      const steps: Step[] = []
      for (let i = 0; i < 500; i++) steps.push({ id: i, message: `s${i}` })
      return steps
    }
    const p = runHeavyPreferWorker(gen, {
      cancel,
      runId: 't1',
      maxSteps: 500,
      preferWorker: false,
    })
    cancel.cancelled = true
    const r = await p
    expect(r.via).toBe('chunked')
    expect(r.status === 'cancelled' || r.steps.length < 500).toBe(true)
  })

  it('runHeavyCancelable terminates optional worker on cancel', async () => {
    const cancel = createCancelFlag()
    const terminate = vi.fn()
    const fakeWorker = { terminate } as unknown as Worker
    const gen = () => {
      const steps: Step[] = []
      for (let i = 0; i < 200; i++) steps.push({ id: i, message: `x${i}` })
      return steps
    }
    const p = runHeavyCancelable(gen, { cancel, runId: 'w1', maxSteps: 200, worker: fakeWorker })
    cancel.cancelled = true
    await p
    expect(terminate).toHaveBeenCalled()
  })
})
