import type { Step } from '../../types/step'
import type { CancelFlag } from './types'
import { runSyncGeneratorCancelable } from './chunkedSolve'

/**
 * Prefer chunked main-thread generation with cooperative cancel.
 * Worker termination available via optional onWorker hook for browser callers.
 */
export function runHeavyCancelable(
  gen: () => Step[],
  opts: {
    cancel: CancelFlag
    runId: string
    maxSteps?: number
    /** Optional Worker to terminate on cancel */
    worker?: Worker | null
  },
): Promise<{ steps: Step[]; status: 'ok' | 'cancelled'; truncated: boolean; runId: string }> {
  const worker = opts.worker ?? null
  const poll = setInterval(() => {
    if (opts.cancel.cancelled) worker?.terminate()
  }, 30)

  return runSyncGeneratorCancelable(gen, {
    cancel: opts.cancel,
    budget: { maxSteps: opts.maxSteps },
    chunkEvery: 16,
  })
    .then((r) => {
      worker?.terminate()
      return { ...r, runId: opts.runId }
    })
    .finally(() => clearInterval(poll))
}
