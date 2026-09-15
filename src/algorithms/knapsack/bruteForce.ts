import type { Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'

/** Enumerate all 2^n subsets. Size-limited by maxN. */
export function bruteForceKnapsack(
  inst: KnapsackInstance,
  maxN = 16,
): KnapsackSolution & { steps?: Step[] } {
  const { items, capacity } = inst
  const DOC = 'knapsack.brute.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const steps: Step[] = []
  let sid = 0
  if (items.length > maxN) {
    return {
      ok: false,
      maxValue: 0,
      method: 'bruteForce',
      truncated: true,
      note: `n=${items.length} 超过暴力枚举上限 ${maxN}`,
      steps: [{ id: 0, message: '截断', codeRefs: ref('enum') }],
    }
  }
  let best = 0
  let bestMask = 0
  const n = items.length
  steps.push({ id: sid++, message: `枚举 2^${n} 子集`, codeRefs: ref('enum') })
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0
    let v = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        w += items[i]!.weight
        v += items[i]!.value
      }
    }
    if (mask % Math.max(1, 1 << Math.max(0, n - 3)) === 0) {
      steps.push({
        id: sid++,
        message: `mask=${mask.toString(2)} w=${w} v=${v}`,
        vars: { mask, w, v, best },
        codeRefs: ref('sum'),
      })
    }
    if (w <= capacity && v > best) {
      best = v
      bestMask = mask
      steps.push({
        id: sid++,
        message: `更新最优 ${best}`,
        vars: { best, bestMask },
        codeRefs: ref('feasible'),
      })
    }
  }
  const selectedIds = items.filter((_, i) => bestMask & (1 << i)).map((it) => it.id)
  const solution = { ok: true as const, maxValue: best, selectedIds, method: 'bruteForce', steps }
  steps.push({
    id: sid++,
    message: `暴力完成 max=${best}`,
    result: solution,
    codeRefs: ref('done'),
  })
  return solution
}
