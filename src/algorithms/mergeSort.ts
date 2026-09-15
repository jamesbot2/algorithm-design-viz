import type { HighlightRole, Step } from '../types/step'

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

  implName: 'mergeSortTopDown',
  implVersion: '1.0.1',
  timeComplexity: 'Θ(n log n)',
  spaceComplexity: 'O(n) 辅助数组 + O(log n) 栈',
  spaceNotes: '合并需要 O(n) 临时空间。',
  inputAssumptions: '任意数值数组。',
  statDefinitions: 'comparisons=归并比较；writes=写入结果次数（若统计）。',
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  let comparisons = 0
  let writes = 0

  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    roles?: Record<number, HighlightRole>,
    pointers?: Record<string, number>,
  ) => {
    const ptrs: Record<string, number> = { ...(pointers ?? {}) }
    for (const k of ['L', 'R', 'mid', 'i', 'j', 'k'] as const) {
      if (ptrs[k] === undefined && typeof vars[k] === 'number' && (vars[k] as number) >= 0) {
        ptrs[k] = vars[k] as number
      }
    }
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      roles: roles ? { a: roles } : undefined,
      arrays: { a: [...a] },
      vars,
      pointers: Object.keys(ptrs).length ? ptrs : undefined,
      stats: { comparisons, writes, swaps: 0 },
      codeLine,
    })
  }

  function merge(L: number, mid: number, R: number) {
    const left = a.slice(L, mid + 1)
    const right = a.slice(mid + 1, R + 1)
    snap(
      `归并区间 [${L},${mid}] 与 [${mid + 1},${R}]`,
      Array.from({ length: R - L + 1 }, (_, i) => L + i),
      { L, mid, R },
      5,
      undefined,
      { L, mid, R },
    )
    let i = 0, j = 0, k = L
    while (i < left.length && j < right.length) {
      comparisons++
      snap(
        `比较 left[${i}]=${left[i]} 与 right[${j}]=${right[j]}`,
        [k],
        { L, mid, R, i, j, k },
        5,
        { [k]: 'compare' },
        { L, mid, R, k },
      )
      if (left[i] <= right[j]) {
        a[k] = left[i++]
      } else {
        a[k] = right[j++]
      }
      writes++
      snap(
        `写入 a[${k}] = ${a[k]}`,
        [k],
        { L, mid, R, i, j, k },
        5,
        { [k]: 'swap' },
        { L, mid, R, k },
      )
      k++
    }
    while (i < left.length) {
      a[k] = left[i++]
      writes++
      snap(`拷贝剩余左半 a[${k}] = ${a[k]}`, [k], { L, mid, R, k }, 5, { [k]: 'read' }, { L, mid, R, k })
      k++
    }
    while (j < right.length) {
      a[k] = right[j++]
      writes++
      snap(`拷贝剩余右半 a[${k}] = ${a[k]}`, [k], { L, mid, R, k }, 5, { [k]: 'read' }, { L, mid, R, k })
      k++
    }
  }

  function sort(L: number, R: number) {
    if (L >= R) {
      snap(`区间 [${L},${R}] 长度 ≤ 1，返回`, L === R ? [L] : [], { L, R }, 1, L === R ? { [L]: 'sorted' } : undefined, { L, R })
      return
    }
    const mid = Math.floor((L + R) / 2)
    snap(
      `分裂 [${L},${R}] → mid=${mid}`,
      Array.from({ length: R - L + 1 }, (_, i) => L + i),
      { L, mid, R },
      2,
      undefined,
      { L, mid, R },
    )
    sort(L, mid)
    sort(mid + 1, R)
    merge(L, mid, R)
  }

  snap('开始归并排序', [], {}, 0)
  sort(0, a.length - 1)
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted)
  return steps
}
