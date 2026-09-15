import type { Step } from '../types/step'

export const meta = {
  id: 'kadane',
  title: '最大子数组（Kadane）',
  complexity: '时间 O(n)，空间 O(1)',
  description: '动态维护以当前位置结尾的最大和，并更新全局最优。',
  code: `best = cur = a[0]
for i = 1 to n-1:
  cur = max(a[i], cur + a[i])
  best = max(best, cur)`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({ id: id++, message, highlights: { a: highlights }, arrays: { a: [...a] }, vars, codeLine })
  }
  if (a.length === 0) {
    snap('空数组', [], {})
    return steps
  }
  let best = a[0], cur = a[0]
  let bestL = 0, bestR = 0, curL = 0
  snap(`初始化 best = cur = a[0] = ${a[0]}`, [0], { best, cur, bestL, bestR }, 0)
  for (let i = 1; i < a.length; i++) {
    snap(`考察 a[${i}] = ${a[i]}`, [i], { i, best, cur, curL }, 1)
    if (cur + a[i] < a[i]) {
      cur = a[i]
      curL = i
      snap(`重新开始：cur ← a[${i}] = ${cur}`, [i], { i, best, cur, curL }, 2)
    } else {
      cur = cur + a[i]
      snap(`延伸：cur ← cur + a[${i}] = ${cur}`, [i], { i, best, cur, curL }, 2)
    }
    if (cur > best) {
      best = cur
      bestL = curL
      bestR = i
      snap(`更新最优区间 [${bestL},${bestR}]，best=${best}`, Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k), { i, best, cur, bestL, bestR }, 3)
    }
  }
  snap(`完成：最大和=${best}，区间[${bestL},${bestR}]`, Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k), { best, bestL, bestR }, 0)
  return steps
}
