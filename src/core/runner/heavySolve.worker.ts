/// <reference lib="webworker" />
import { generateSteps as nQueensGenerate } from '../../algorithms/nQueens'
import { bruteForceKnapsack } from '../../algorithms/knapsack/bruteForce'

import { solveAdvanced } from '../../algorithms/advanced/registry'
import type { HeavyRequest } from './heavyTypes'

self.onmessage = (ev: MessageEvent<HeavyRequest>) => {
  const msg = ev.data
  try {
    if (msg.kind === 'advanced') {
      const r = solveAdvanced(msg.id, msg.input)
      if (!r.ok) self.postMessage({ ok: false, runId: msg.runId, error: r.issues.map((i) => i.reason).join('; '), kind: msg.kind })
      else self.postMessage({ ok: true, runId: msg.runId, steps: r.steps, result: r.result, kind: msg.kind })
      return
    }
    if (msg.kind === 'nQueens') {
      const steps = nQueensGenerate([], msg.n, msg.mode)
      self.postMessage({ ok: true, runId: msg.runId, steps, kind: msg.kind })
      return
    }
    if (msg.kind === 'knapsackBrute') {
      const sol = bruteForceKnapsack({ items: msg.items, capacity: msg.capacity })
      self.postMessage({
        ok: true,
        runId: msg.runId,
        steps: sol.steps ?? [],
        result: sol,
        kind: msg.kind,
      })
      return
    }
    self.postMessage({ ok: false, runId: (msg as { runId: string }).runId, error: 'unknown kind' })
  } catch (e) {
    self.postMessage({
      ok: false,
      runId: (msg as { runId: string }).runId,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}

export {}
