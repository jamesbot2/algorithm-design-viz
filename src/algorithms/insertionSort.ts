import type { HighlightRole, Step } from '../types/step'

export const meta = {
  id: 'insertionSort',
  title: '插入排序',
  complexity: '时间 O(n²)，空间 O(1)',
  description: '将每个元素插入到左侧已排序区间的正确位置。',
  code: `for i = 1 to n-1
  key = a[i]
  j = i - 1
  while j >= 0 and a[j] > key
    a[j+1] = a[j]
    j--
  a[j+1] = key`,

  implName: 'insertionSort',
  implVersion: '1.0.1',
  timeComplexity: '最坏 O(n²)，最好 O(n)',
  spaceComplexity: 'O(1)',
  spaceNotes: '原地。',
  inputAssumptions: '任意数值数组。',
  statDefinitions: 'comparisons=插入探测比较；writes/swaps 依实现计入 swaps。',
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
    const sortedRoles: Record<number, HighlightRole> = { ...(roles ?? {}) }
    const iVar = typeof vars.i === 'number' ? vars.i : -1
    if (iVar >= 1) {
      for (let s = 0; s < iVar; s++) {
        if (!(s in sortedRoles)) sortedRoles[s] = 'sorted'
      }
    }
    const ptrs =
      pointers ??
      {
        ...(typeof vars.i === 'number' && vars.i >= 0 ? { i: vars.i as number } : {}),
        ...(typeof vars.j === 'number' && (vars.j as number) >= 0 ? { j: vars.j as number } : {}),
      }
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      roles: Object.keys(sortedRoles).length ? { a: sortedRoles } : undefined,
      arrays: { a: [...a] },
      vars: { n: a.length, ...vars },
      pointers: Object.keys(ptrs).length ? ptrs : undefined,
      stats: { comparisons, writes, swaps: 0 },
      codeLine,
    })
  }

  snap('开始插入排序', [], {}, 0)
  for (let i = 1; i < a.length; i++) {
    const key = a[i]
    let j = i - 1
    snap(`取出 key = a[${i}] = ${key}`, [i], { i, j, key }, 1, { [i]: 'read' }, { i, j })
    while (j >= 0 && a[j] > key) {
      comparisons++
      snap(
        `a[${j}]=${a[j]} > key=${key}，右移`,
        [j, j + 1],
        { i, j, key },
        3,
        { [j]: 'compare', [j + 1]: 'swap' },
        { i, j },
      )
      a[j + 1] = a[j]
      writes++
      snap(
        `a[${j + 1}] ← ${a[j + 1]}`,
        [j + 1],
        { i, j, key },
        4,
        { [j + 1]: 'swap' },
        { i, j },
      )
      j--
    }
    if (j >= 0) comparisons++
    a[j + 1] = key
    writes++
    snap(
      `插入 key 到位置 ${j + 1}`,
      [j + 1],
      { i, j, key },
      5,
      { [j + 1]: 'focus' },
      { i, ...(j >= 0 ? { j } : {}) },
    )
  }
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted)
  return steps
}
