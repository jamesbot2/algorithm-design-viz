import type { ArrayOp, HighlightRole, Step } from '../types/step'

export const meta = {
  id: 'bubbleSort',
  title: '冒泡排序',
  complexity: '时间 O(n²)，空间 O(1)',
  description: '反复比较相邻元素并交换，使较大元素逐渐「冒泡」到末尾。',
  code: `for i = 0 to n-2
  for j = 0 to n-2-i
    if a[j] > a[j+1]
      swap(a[j], a[j+1])`,

  implName: 'bubbleSortAdjacent',
  implVersion: '1.0.2',
  timeComplexity: '最坏/平均 O(n²)，最好 O(n)（本实现无提前退出则为 O(n²)）',
  spaceComplexity: 'O(1)',
  spaceNotes: '原地交换。',
  inputAssumptions: '任意数值数组。',
  statDefinitions: 'comparisons=相邻比较；swaps=交换次数。',
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const elementIds = input.map((_, i) => `b${i}`)
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
    arrayOps?: ArrayOp[],
    phase?: string,
  ): void => {
    const sortedRoles: Record<number, HighlightRole> = { ...(roles ?? {}) }
    const iVar = typeof vars.i === 'number' ? vars.i : -1
    if (iVar >= 0) {
      for (let s = a.length - iVar; s < a.length; s++) {
        if (s >= 0 && !(s in sortedRoles)) sortedRoles[s] = 'sorted'
      }
    }
    steps.push({
      id: id++,
      message,
      phase,
      highlights: { a: highlights },
      roles: Object.keys(sortedRoles).length ? { a: sortedRoles } : undefined,
      arrays: { a: [...a] },
      elementIds: { a: [...elementIds] },
      arrayOps: arrayOps?.length ? { a: arrayOps } : undefined,
      vars: { n: a.length, ...vars },
      pointers: pointers ?? (typeof vars.i === 'number' || typeof vars.j === 'number'
        ? {
            ...(typeof vars.i === 'number' && vars.i >= 0 ? { i: vars.i } : {}),
            ...(typeof vars.j === 'number' && vars.j >= 0 ? { j: vars.j } : {}),
          }
        : undefined),
      stats: { comparisons, swaps },
      codeLine,
    })
  }

  snap('开始冒泡排序', [], { i: null, j: null }, 0, undefined, undefined, undefined, 'init')
  const n = a.length
  for (let i = 0; i < n - 1; i++) {
    snap(`外层循环 i = ${i}，已排好区间 [${n - i}, ${n - 1}]`, [], { i, j: null }, 1, undefined, { i }, undefined, 'outer')
    for (let j = 0; j < n - 1 - i; j++) {
      comparisons++
      snap(
        `比较 a[${j}]=${a[j]} 与 a[${j + 1}]=${a[j + 1]}`,
        [j, j + 1],
        { i, j },
        2,
        { [j]: 'compare', [j + 1]: 'compare' },
        { i, j },
        [{ type: 'compare', indices: [j, j + 1], elementIds: [elementIds[j]!, elementIds[j + 1]!] }],
        'compare',
      )
      if (a[j]! > a[j + 1]!) {
        ;[a[j], a[j + 1]] = [a[j + 1]!, a[j]!]
        ;[elementIds[j], elementIds[j + 1]] = [elementIds[j + 1]!, elementIds[j]!]
        swaps++
        snap(
          `交换：a[${j}] ↔ a[${j + 1}]`,
          [j, j + 1],
          { i, j, swapped: true },
          3,
          { [j]: 'swap', [j + 1]: 'swap' },
          { i, j },
          [{ type: 'swap', indices: [j, j + 1], elementIds: [elementIds[j]!, elementIds[j + 1]!] }],
          'swap',
        )
      } else {
        snap(
          `无需交换`,
          [j, j + 1],
          { i, j, swapped: false },
          2,
          { [j]: 'compare', [j + 1]: 'compare' },
          { i, j },
          [{ type: 'compare', indices: [j, j + 1], elementIds: [elementIds[j]!, elementIds[j + 1]!] }],
          'compare',
        )
      }
    }
  }
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < n; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], { i: null, j: null }, 0, allSorted, undefined, undefined, 'done')
  return steps
}
