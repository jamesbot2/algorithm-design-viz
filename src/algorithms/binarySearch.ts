import type { Step } from '../types/step'

export const meta = {
  id: 'binarySearch',
  title: '二分查找',
  complexity: '时间 O(log n)，空间 O(1)',
  description: '在有序数组中通过不断折半查找目标值。',
  code: `lo = 0, hi = n-1
while lo <= hi:
  mid = (lo+hi)/2
  if a[mid] == target: return mid
  if a[mid] < target: lo = mid+1
  else: hi = mid-1`,
  defaultTarget: 7,
}

export function generateSteps(input: number[], target = 7): Step[] {
  const a = [...input].sort((x, y) => x - y)
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({ id: id++, message, highlights: { a: highlights }, arrays: { a: [...a] }, vars: { target, ...vars }, codeLine })
  }
  let lo = 0, hi = a.length - 1
  snap(`有序数组上二分查找 target=${target}`, [], { lo, hi }, 0)
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    snap(`mid = ${mid}，a[mid]=${a[mid]}`, [mid], { lo, mid, hi }, 2)
    if (a[mid] === target) {
      snap(`找到！下标 ${mid}`, [mid], { lo, mid, hi, found: mid }, 3)
      return steps
    }
    if (a[mid] < target) {
      snap(`a[mid] < target，lo ← mid+1`, [mid], { lo, mid, hi }, 4)
      lo = mid + 1
    } else {
      snap(`a[mid] > target，hi ← mid-1`, [mid], { lo, mid, hi }, 5)
      hi = mid - 1
    }
  }
  snap('未找到目标', [], { lo, hi, found: null }, 0)
  return steps
}
