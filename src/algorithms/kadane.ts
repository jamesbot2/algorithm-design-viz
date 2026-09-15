import type { Step } from '../types/step'

export const meta = {
  id: 'kadane',
  title: '最大子数组（Kadane）',
  complexity: '时间 O(n)，空间 O(1)',
  description:
    '动态维护以当前位置结尾的最大和。约定：求非空子数组；全负时返回最大元素；空数组无子数组。',
  code: `best = cur = a[0]
for i = 1 to n-1:
  cur = max(a[i], cur + a[i])
  best = max(best, cur)`,
  implName: 'kadaneNonempty',
  implVersion: '1.1.0',
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  spaceNotes: '若干标量。',
  inputAssumptions: '非空子数组；空输入 → 无子数组；全负 → 最大元素及其单点区间。',
  statDefinitions: '不累计 comparisons。',
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    result?: unknown,
    ranges?: { current?: [number, number]; best?: [number, number] },
  ) => {
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      arrays: { a: [...a] },
      arrayPointers:
        typeof vars.i === 'number' ? { a: { i: vars.i as number } } : undefined,
      vars,
      codeLine,
      result,
      ranges,
    })
  }
  if (a.length === 0) {
    snap('空数组：不存在非空子数组', [], { empty: true }, 0, {
      ok: true,
      hasSubarray: false,
      best: null,
      range: null,
    })
    return steps
  }
  let best = a[0]
  let cur = a[0]
  let bestL = 0
  let bestR = 0
  let curL = 0
  snap(`初始化 best = cur = a[0] = ${a[0]}`, [0], { best, cur, bestL, bestR }, 0, undefined, { current: [0, 0], best: [0, 0] })
  for (let i = 1; i < a.length; i++) {
    snap(`考察 a[${i}] = ${a[i]}`, [i], { i, best, cur, curL }, 1, undefined, { current: [curL, i - 1 >= curL ? i - 1 : curL], best: [bestL, bestR] })
    if (cur + a[i] < a[i]) {
      cur = a[i]
      curL = i
      snap(`重新开始：cur ← a[${i}] = ${cur}`, [i], { i, best, cur, curL }, 2, undefined, { current: [curL, i], best: [bestL, bestR] })
    } else {
      cur = cur + a[i]
      snap(`延伸：cur ← cur + a[${i}] = ${cur}`, [i], { i, best, cur, curL }, 2, undefined, { current: [curL, i], best: [bestL, bestR] })
    }
    if (cur > best) {
      best = cur
      bestL = curL
      bestR = i
      snap(
        `更新最优区间 [${bestL},${bestR}]，best=${best}`,
        Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k),
        { i, best, cur, bestL, bestR },
        3,
        undefined,
        { current: [curL, i], best: [bestL, bestR] },
      )
    }
  }
  snap(
    `完成：最大和=${best}，区间[${bestL},${bestR}]（非空子数组）`,
    Array.from({ length: bestR - bestL + 1 }, (_, k) => bestL + k),
    { best, bestL, bestR },
    0,
    { ok: true, hasSubarray: true, best, range: [bestL, bestR] },
    { current: [bestL, bestR], best: [bestL, bestR] },
  )
  return steps
}
