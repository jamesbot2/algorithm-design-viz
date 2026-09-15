import type { Step } from '../../types/step'
import type { CancelFlag } from './types'
import { runSyncGeneratorCancelable } from './chunkedSolve'
import type { HeavyRequest } from './heavyTypes'

export function createHeavyWorker(): Worker | null {
  try {
    if (typeof Worker === 'undefined') return null
    return new Worker(new URL('./heavySolve.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

function runOnWorker(
  worker: Worker,
  request: HeavyRequest,
  cancel: CancelFlag,
): Promise<{ steps: Step[]; status: 'ok' | 'cancelled'; truncated: boolean }> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (r: { steps: Step[]; status: 'ok' | 'cancelled'; truncated: boolean }) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      worker.removeEventListener('message', onMsg)
      worker.removeEventListener('error', onErr)
      try {
        worker.terminate()
      } catch {
        /* ignore */
      }
      resolve(r)
    }
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data as {
        ok?: boolean
        runId?: string
        steps?: Step[]
        error?: string
      }
      if (data.runId && data.runId !== request.runId) return
      if (cancel.cancelled) {
        finish({ steps: data.steps ?? [], status: 'cancelled', truncated: false })
        return
      }
      if (!data.ok) {
        finish({ steps: [], status: 'cancelled', truncated: false })
        return
      }
      finish({ steps: data.steps ?? [], status: 'ok', truncated: false })
    }
    const onErr = () => {
      finish({ steps: [], status: 'cancelled', truncated: false })
    }
    const poll = setInterval(() => {
      if (cancel.cancelled) {
        try {
          worker.terminate()
        } catch {
          /* ignore */
        }
        finish({ steps: [], status: 'cancelled', truncated: false })
      }
    }, 30)
    worker.addEventListener('message', onMsg)
    worker.addEventListener('error', onErr)
    worker.postMessage(request)
  })
}

/**
 * Prefer Worker for nQueens / knapsack-brute when available; terminate on cancel.
 * Falls back to chunked main-thread generation.
 */
export async function runHeavyPreferWorker(
  gen: () => Step[],
  opts: {
    cancel: CancelFlag
    runId: string
    maxSteps?: number
    preferWorker?: boolean
    workerRequest?: HeavyRequest | null
  },
): Promise<{ steps: Step[]; status: 'ok' | 'cancelled'; truncated: boolean; runId: string; via: 'worker' | 'chunked' }> {
  if (opts.preferWorker && opts.workerRequest) {
    const worker = createHeavyWorker()
    if (worker) {
      const r = await runOnWorker(worker, opts.workerRequest, opts.cancel)
      return { ...r, runId: opts.runId, via: 'worker' }
    }
  }

  const r = await runSyncGeneratorCancelable(gen, {
    cancel: opts.cancel,
    budget: { maxSteps: opts.maxSteps },
    chunkEvery: 8,
  })
  return { ...r, runId: opts.runId, via: 'chunked' }
}

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
