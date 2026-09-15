import type { HighlightRole, Step } from '../types/step'

export const meta = {
  id: 'quickSort',
  title: '快速排序',
  complexity: '平均 O(n log n)，最坏 O(n²)，空间 O(log n)',
  description: '选取枢轴划分，使左侧 ≤ 枢轴 ≤ 右侧，再递归两侧。',
  code: `quickSort(a, L, R):
  if L >= R: return
  p = partition(a, L, R)
  quickSort(a, L, p-1)
  quickSort(a, p+1, R)`,
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const steps: Step[] = []
  let id = 0
  let comparisons = 0
  let swaps = 0

  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    roles?: Record<number, HighlightRole>,
    pointers?: Record<string, number>,
  ) => {
    const ptrs: Record<string, number> = { ...(pointers ?? {}) }
    for (const k of ['L', 'R', 'i', 'j', 'p', 'mid'] as const) {
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
      stats: { comparisons, swaps },
      codeLine,
    })
  }

  function partition(L: number, R: number): number {
    const pivot = a[R]
    snap(
      `选取枢轴 pivot = a[${R}] = ${pivot}`,
      [R],
      { L, R, pivot },
      2,
      { [R]: 'pivot' },
      { L, R },
    )
    let i = L - 1
    for (let j = L; j < R; j++) {
      comparisons++
      snap(
        `比较 a[${j}]=${a[j]} 与 pivot=${pivot}`,
        [j, R],
        { L, R, i, j, pivot },
        2,
        { [j]: 'compare', [R]: 'pivot' },
        { L, R, ...(i >= 0 ? { i } : {}), j },
      )
      if (a[j] <= pivot) {
        i++
        ;[a[i], a[j]] = [a[j], a[i]]
        swaps++
        snap(
          `a[${j}] ≤ pivot，交换 a[${i}] ↔ a[${j}]`,
          [i, j],
          { L, R, i, j, pivot },
          2,
          { [i]: 'swap', [j]: 'swap', [R]: 'pivot' },
          { L, R, i, j },
        )
      }
    }
    ;[a[i + 1], a[R]] = [a[R], a[i + 1]]
    swaps++
    const p = i + 1
    snap(
      `枢轴就位：交换 a[${p}] ↔ a[${R}]`,
      [p, R],
      { L, R, pivot, p },
      2,
      { [p]: 'pivot' },
      { L, R, p },
    )
    return p
  }

  function sort(L: number, R: number) {
    if (L >= R) {
      snap(`区间 [${L},${R}] 无需划分`, L === R ? [L] : [], { L, R }, 1, L === R ? { [L]: 'sorted' } : undefined, { L, R })
      return
    }
    snap(
      `划分区间 [${L},${R}]`,
      Array.from({ length: R - L + 1 }, (_, i) => L + i),
      { L, R },
      2,
      undefined,
      { L, R },
    )
    const p = partition(L, R)
    sort(L, p - 1)
    sort(p + 1, R)
  }

  snap('开始快速排序', [], {}, 0)
  sort(0, a.length - 1)
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted)
  return steps
}
