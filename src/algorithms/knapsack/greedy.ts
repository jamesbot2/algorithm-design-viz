import type { Step } from '../../types/step'
import type { KnapsackInstance, KnapsackSolution } from './types'

/** 0-1 greedy by density — NOT always optimal. */
export function greedyByDensity(inst: KnapsackInstance): KnapsackSolution & { steps: Step[] } {
  const DOC = 'knapsack.greedy.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const steps: Step[] = []
  let id = 0
  const sorted = [...inst.items].sort((a, b) => {
    const da = a.value / a.weight
    const db = b.value / b.weight
    return db - da || a.id.localeCompare(b.id)
  })
  steps.push({
    id: id++,
    message: `按密度排序：${sorted.map((it) => `${it.id}(${(it.value / it.weight).toFixed(2)})`).join(', ')}`,
    codeRefs: ref('sort'),
  })
  let w = 0
  let v = 0
  const selectedIds: string[] = []
  for (const it of sorted) {
    steps.push({
      id: id++,
      message: `考察 ${it.id} w=${it.weight}；剩余 ${inst.capacity - w}`,
      codeRefs: ref('check'),
    })
    if (w + it.weight <= inst.capacity) {
      w += it.weight
      v += it.value
      selectedIds.push(it.id)
      steps.push({
        id: id++,
        message: `贪心选取 ${it.id}`,
        vars: { v, w },
        codeRefs: ref('pick'),
      })
    }
  }
  const solution = {
    ok: true as const,
    maxValue: v,
    selectedIds,
    method: 'greedyDensity',
    note: '0-1 按密度贪心；未必最优（见反例 W=50 → 160 vs opt 220）',
    steps,
  }
  steps.push({
    id: id++,
    message: `贪心完成 value=${v}`,
    result: solution,
    codeRefs: ref('done'),
  })
  return solution
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
