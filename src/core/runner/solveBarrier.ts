/**
 * Optional solve barrier for tests: install a deferred gate so async runs
 * do not complete until the test releases them. Production: no-op.
 */

export type SolveBarrierContext = {
  algoId: string
  runId: string
  generation: number
}

type BarrierFn = (ctx: SolveBarrierContext) => Promise<void>

let installed: BarrierFn | null = null

/** Install a barrier; returns uninstall. Idempotent uninstall. */
export function installSolveBarrier(fn: BarrierFn): () => void {
  installed = fn
  return () => {
    if (installed === fn) installed = null
  }
}

export function clearSolveBarrier(): void {
  installed = null
}

/** Await installed barrier if any; always safe to call. */
export async function maybeAwaitSolveBarrier(ctx: SolveBarrierContext): Promise<void> {
  const fn = installed
  if (fn) await fn(ctx)
}

/** Controllable deferred for tests. */
export function createDeferred<T = void>(): {
  promise: Promise<T>
  resolve: (v: T | PromiseLike<T>) => void
  reject: (e?: unknown) => void
} {
  let resolve!: (v: T | PromiseLike<T>) => void
  let reject!: (e?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
