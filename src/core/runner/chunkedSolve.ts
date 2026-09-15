import type { Step } from '../../types/step'
import type { CancelFlag, RunBudget } from './types'
import { yieldToEventLoop } from './asyncRun'

/**
 * Run a sync step generator in time-sliced chunks so cancel can land.
 * Budget maxSteps is enforced while recording (not only post-slice).
 */
export async function chunkedGenerateSteps(
  generate: (onStep: (s: Step) => boolean | void) => void | { steps: Step[]; result?: unknown },
  opts: { cancel: CancelFlag; budget?: RunBudget; chunkEvery?: number },
): Promise<{ steps: Step[]; result?: unknown; status: 'ok' | 'cancelled'; truncated: boolean }> {
  const steps: Step[] = []
  const chunkEvery = opts.chunkEvery ?? 32
  let truncated = false
  let cancelled = false
  let i = 0

  const push = (s: Step): boolean => {
    if (opts.cancel.cancelled) {
      cancelled = true
      return false
    }
    if (opts.budget?.maxSteps !== undefined && steps.length >= opts.budget.maxSteps) {
      truncated = true
      return false
    }
    steps.push(s)
    return true
  }

  // Adapter: if generate returns all at once, we still chunk by yielding while copying
  const ret = generate((s) => push(s))
  if (ret && Array.isArray((ret as { steps?: Step[] }).steps)) {
    const all = (ret as { steps: Step[]; result?: unknown }).steps
    steps.length = 0
    for (const s of all) {
      if (opts.cancel.cancelled) {
        cancelled = true
        break
      }
      if (opts.budget?.maxSteps !== undefined && steps.length >= opts.budget.maxSteps) {
        truncated = true
        break
      }
      steps.push(s)
      i++
      if (i % chunkEvery === 0) await yieldToEventLoop()
    }
    return {
      steps,
      result: (ret as { result?: unknown }).result,
      status: cancelled ? 'cancelled' : 'ok',
      truncated,
    }
  }

  return {
    steps,
    status: cancelled ? 'cancelled' : 'ok',
    truncated,
  }
}

/** Wrap a classic generateSteps() into cancelable async with mid-copy yields. */
export async function runSyncGeneratorCancelable(
  gen: () => Step[],
  opts: { cancel: CancelFlag; budget?: RunBudget; chunkEvery?: number },
): Promise<{ steps: Step[]; status: 'ok' | 'cancelled'; truncated: boolean }> {
  // Allow cancel click before we start
  await yieldToEventLoop()
  if (opts.cancel.cancelled) return { steps: [], status: 'cancelled', truncated: false }

  const all = gen()
  const steps: Step[] = []
  let truncated = false
  const chunkEvery = opts.chunkEvery ?? 24
  for (let i = 0; i < all.length; i++) {
    if (opts.cancel.cancelled) return { steps, status: 'cancelled', truncated }
    if (opts.budget?.maxSteps !== undefined && steps.length >= opts.budget.maxSteps) {
      truncated = true
      break
    }
    steps.push(all[i]!)
    if (i % chunkEvery === 0) await yieldToEventLoop()
  }
  return { steps, status: 'ok', truncated }
}
