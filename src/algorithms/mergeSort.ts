import type { Step } from '../types/step'

export const meta = {
  id: 'mergeSort',
  title: '归并排序',
  complexity: '时间 O(n log n)，空间 O(n)',
  description: '分治：将数组对半拆分，递归排序后归并两个有序子数组。',
  code: `mergeSort(a, L, R):
  if L >= R: return
  mid = (L+R)/2
  mergeSort(a, L, mid)
  mergeSort(a, mid+1, R)
  merge(a, L, mid, R)`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, highlights: number[] = [], vars: Record<string, string | number | boolean | null> = {}, codeLine?: number) => {
    steps.push({ id: id++, message, highlights: { a: highlights }, arrays: { a: [...a] }, vars, codeLine })
  }

  function merge(L: number, mid: number, R: number) {
    const left = a.slice(L, mid + 1)
    const right = a.slice(mid + 1, R + 1)
    snap(`归并区间 [${L},${mid}] 与 [${mid + 1},${R}]`, Array.from({ length: R - L + 1 }, (_, i) => L + i), { L, mid, R }, 5)
    let i = 0, j = 0, k = L
    while (i < left.length && j < right.length) {
      snap(`比较 left[${i}]=${left[i]} 与 right[${j}]=${right[j]}`, [k], { L, mid, R, i, j, k }, 5)
      if (left[i] <= right[j]) {
        a[k] = left[i++]
      } else {
        a[k] = right[j++]
      }
      snap(`写入 a[${k}] = ${a[k]}`, [k], { L, mid, R, i, j, k }, 5)
      k++
    }
    while (i < left.length) {
      a[k] = left[i++]
      snap(`拷贝剩余左半 a[${k}] = ${a[k]}`, [k], { L, mid, R, k }, 5)
      k++
    }
    while (j < right.length) {
      a[k] = right[j++]
      snap(`拷贝剩余右半 a[${k}] = ${a[k]}`, [k], { L, mid, R, k }, 5)
      k++
    }
  }

  function sort(L: number, R: number) {
    if (L >= R) {
      snap(`区间 [${L},${R}] 长度 ≤ 1，返回`, L === R ? [L] : [], { L, R }, 1)
      return
    }
    const mid = Math.floor((L + R) / 2)
    snap(`分裂 [${L},${R}] → mid=${mid}`, Array.from({ length: R - L + 1 }, (_, i) => L + i), { L, mid, R }, 2)
    sort(L, mid)
    sort(mid + 1, R)
    merge(L, mid, R)
  }

  snap('开始归并排序', [], {}, 0)
  sort(0, a.length - 1)
  snap('排序完成', [], {}, 0)
  return steps
}
