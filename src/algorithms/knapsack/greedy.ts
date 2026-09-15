import type { KnapsackInstance, KnapsackSolution } from './types'

/** 0-1 greedy by density — NOT always optimal. */
export function greedyByDensity(inst: KnapsackInstance): KnapsackSolution {
  const sorted = [...inst.items].sort((a, b) => {
    const da = a.value / a.weight
    const db = b.value / b.weight
    return db - da || a.id.localeCompare(b.id)
  })
  let w = 0
  let v = 0
  const selectedIds: string[] = []
  for (const it of sorted) {
    if (w + it.weight <= inst.capacity) {
      w += it.weight
      v += it.value
      selectedIds.push(it.id)
    }
  }
  return {
    ok: true,
    maxValue: v,
    selectedIds,
    method: 'greedyDensity',
    note: '0-1 按密度贪心；未必最优（见反例 W=50 → 160 vs opt 220）',
  }
}

/** Fractional knapsack — optimal for divisible items. */
export function fractionalGreedy(inst: KnapsackInstance): {
  value: number
  method: string
} {
  const sorted = [...inst.items].sort((a, b) => b.value / b.weight - a.value / a.weight)
  let cap = inst.capacity
  let value = 0
  for (const it of sorted) {
    if (cap <= 0) break
    if (it.weight <= cap) {
      cap -= it.weight
      value += it.value
    } else {
      value += (it.value * cap) / it.weight
      cap = 0
    }
  }
  return { value, method: 'fractionalGreedy' }
}
