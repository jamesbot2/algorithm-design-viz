export interface KnapsackItem {
  id: string
  weight: number
  value: number
}

export interface KnapsackInstance {
  items: KnapsackItem[]
  capacity: number
}

export interface KnapsackSolution {
  ok: boolean
  maxValue: number
  /** Selected item ids (one optimal set when reconstructed) */
  selectedIds?: string[]
  method: string
  truncated?: boolean
  note?: string
}

export const GREEDY_COUNTEREXAMPLE: KnapsackInstance = {
  items: [
    { id: 'A', weight: 10, value: 60 },
    { id: 'B', weight: 20, value: 100 },
    { id: 'C', weight: 30, value: 120 },
  ],
  capacity: 50,
}
// greedy by density: A(6)+B(5)=160; opt A+C? 10+30=40 → 180; B+C=50 → 220

export const FORWARD_UPDATE_COUNTEREXAMPLE: KnapsackInstance = {
  items: [{ id: 'x', weight: 2, value: 3 }],
  capacity: 4,
}
// Wrong forward 1D update: for w=2..4: dp[w]=dp[w-2]+3 → dp[2]=3, dp[4]=6 (wrong; 0-1 only one item → 3)

export const DEFAULT_INSTANCE: KnapsackInstance = {
  items: [
    { id: '1', weight: 2, value: 3 },
    { id: '2', weight: 3, value: 4 },
    { id: '3', weight: 4, value: 5 },
    { id: '4', weight: 5, value: 6 },
  ],
  capacity: 8,
}

export function validateKnapsackInstance(raw: unknown): {
  ok: true
  value: KnapsackInstance
} | {
  ok: false
  issues: { field: string; reason: string }[]
} {
  const r = (raw ?? {}) as Partial<KnapsackInstance>
  const items = r.items
  const capacity = r.capacity
  const issues: { field: string; reason: string }[] = []
  if (!Array.isArray(items)) {
    issues.push({ field: 'items', reason: '须为数组' })
  } else {
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it || typeof it.id !== 'string') {
        issues.push({ field: `items[${i}].id`, reason: '须为字符串' })
      }
      if (!it || typeof it.weight !== 'number' || !Number.isInteger(it.weight) || it.weight <= 0) {
        issues.push({ field: `items[${i}].weight`, reason: '须为正整数' })
      }
      if (!it || typeof it.value !== 'number' || !Number.isInteger(it.value) || it.value < 0) {
        issues.push({ field: `items[${i}].value`, reason: '须为非负整数' })
      }
    }
  }
  if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 0) {
    issues.push({ field: 'capacity', reason: '须为非负整数（允许 0）' })
  }
  if (issues.length) return { ok: false, issues }
  return { ok: true, value: { items: items as KnapsackItem[], capacity: capacity as number } }
}
