import type { KnapsackInstance, KnapsackSolution } from './types'

/** Enumerate all 2^n subsets. Size-limited by maxN. */
export function bruteForceKnapsack(
  inst: KnapsackInstance,
  maxN = 16,
): KnapsackSolution {
  const { items, capacity } = inst
  if (items.length > maxN) {
    return {
      ok: false,
      maxValue: 0,
      method: 'bruteForce',
      truncated: true,
      note: `n=${items.length} 超过暴力枚举上限 ${maxN}`,
    }
  }
  let best = 0
  let bestMask = 0
  const n = items.length
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0
    let v = 0
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        w += items[i]!.weight
        v += items[i]!.value
      }
    }
    if (w <= capacity && v > best) {
      best = v
      bestMask = mask
    }
  }
  const selectedIds = items.filter((_, i) => bestMask & (1 << i)).map((it) => it.id)
  return { ok: true, maxValue: best, selectedIds, method: 'bruteForce' }
}
