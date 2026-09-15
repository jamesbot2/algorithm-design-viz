import type { Step } from '../types/step'

export const meta = {
  id: 'maxSubarrayDC',
  title: '最大子数组（分治）',
  complexity: '时间 Θ(n log n)，空间 O(log n) 递归栈',
  description:
    '分治：答案在左半、右半或跨越中点。与 Kadane O(n)、暴力 O(n²) 对照。例 [-2,1,-3,4,-1,2,1,-5,4] → 6。',
  code: `maxSub(lo,hi):
  if lo==hi: return a[lo]
  mid=(lo+hi)/2
  return max(maxSub(lo,mid), maxSub(mid+1,hi), maxCrossing(lo,mid,hi))`,
  defaultArray: [-2, 1, -3, 4, -1, 2, 1, -5, 4],
  implName: 'maxSubarrayDivideConquer',
  implVersion: '1.0.0',
  timeComplexity: 'Θ(n log n)',
  spaceComplexity: 'O(log n)',
}

export interface MaxSubResult {
  ok: boolean
  best: number
  left: number
  right: number
  method: string
}

export function maxSubarrayBrute(a: number[]): MaxSubResult {
  if (a.length === 0) {
    return { ok: true, best: 0, left: -1, right: -1, method: 'bruteO2' }
  }
  let best = -Infinity
  let L = 0
  let R = 0
  for (let i = 0; i < a.length; i++) {
    let sum = 0
    for (let j = i; j < a.length; j++) {
      sum += a[j]!
      if (sum > best) {
        best = sum
        L = i
        R = j
      }
    }
  }
  return { ok: true, best, left: L, right: R, method: 'bruteO2' }
}

export function solveMaxSubarrayDC(a: number[]): {
  result: MaxSubResult
  steps: Step[]
} {
  const steps: Step[] = []
  let id = 0
  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
  ) => {
    steps.push({
      id: id++,
      message,
      arrays: { a: [...a] },
      highlights: { a: highlights },
      arrayPointers:
        typeof vars.lo === 'number' && typeof vars.hi === 'number'
          ? { a: { lo: vars.lo as number, hi: vars.hi as number, mid: vars.mid as number } }
          : undefined,
      vars,
      result,
    })
  }

  if (a.length === 0) {
    const result = { ok: true, best: 0, left: -1, right: -1, method: 'divideConquer' }
    snap('空数组', [], {}, result)
    return { result, steps }
  }

  function crossing(
    lo: number,
    mid: number,
    hi: number,
  ): { sum: number; left: number; right: number } {
    let leftSum = -Infinity
    let sum = 0
    let left = mid
    for (let i = mid; i >= lo; i--) {
      sum += a[i]!
      if (sum > leftSum) {
        leftSum = sum
        left = i
      }
    }
    let rightSum = -Infinity
    sum = 0
    let right = mid + 1
    for (let j = mid + 1; j <= hi; j++) {
      sum += a[j]!
      if (sum > rightSum) {
        rightSum = sum
        right = j
      }
    }
    return { sum: leftSum + rightSum, left, right }
  }

  function maxSub(
    lo: number,
    hi: number,
  ): { sum: number; left: number; right: number } {
    if (lo === hi) {
      snap(`叶子 [${lo},${hi}] = ${a[lo]}`, [lo], { lo, hi, mid: lo })
      return { sum: a[lo]!, left: lo, right: hi }
    }
    const mid = Math.floor((lo + hi) / 2)
    snap(`分解 [${lo},${hi}] mid=${mid}`, [], { lo, hi, mid })
    const L = maxSub(lo, mid)
    const R = maxSub(mid + 1, hi)
    const C = crossing(lo, mid, hi)
    snap(
      `合并 [${lo},${hi}]：左=${L.sum} 右=${R.sum} 跨=${C.sum}`,
      Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      { lo, hi, mid, leftSum: L.sum, rightSum: R.sum, crossSum: C.sum },
    )
    if (L.sum >= R.sum && L.sum >= C.sum) return L
    if (R.sum >= L.sum && R.sum >= C.sum) return R
    return C
  }

  const ans = maxSub(0, a.length - 1)
  const result: MaxSubResult = {
    ok: true,
    best: ans.sum,
    left: ans.left,
    right: ans.right,
    method: 'divideConquer',
  }
  snap(
    `分治结果 = ${ans.sum}，区间 [${ans.left},${ans.right}]`,
    Array.from({ length: ans.right - ans.left + 1 }, (_, i) => ans.left + i),
    { answer: ans.sum },
    result,
  )
  return { result, steps }
}

export function generateSteps(input: number[]): Step[] {
  const a = input.length ? input : meta.defaultArray
  return solveMaxSubarrayDC(a).steps
}
