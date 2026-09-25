import type { ArrayOp, HighlightRole, Step } from '../types/step'
import type { PresentationDescriptor } from '../types/presentation'

export const meta = {
  id: 'quickSort',
  title: '快速排序',
  complexity: '平均 O(n log n)，最坏 O(n²)；辅助空间平均 O(log n)（递归栈，非 O(1)）',
  description:
    '选取枢轴划分，使左侧 ≤ 枢轴 ≤ 右侧，再递归两侧。本实现原地交换 + 递归，整体空间含调用栈。',
  code: `quickSort(a, L, R):
  if L >= R: return
  p = partition(a, L, R)
  quickSort(a, L, p-1)
  quickSort(a, p+1, R)`,
  implName: 'quickSortLomuto',
  implVersion: '1.2.0',
  timeComplexity: '平均 O(n log n)，最坏 O(n²)',
  spaceComplexity: '平均 O(log n) 递归栈，最坏 O(n)；非整体 O(1)',
  spaceNotes: '数组原地；额外空间主要来自递归调用栈，不可标为整体 O(1)。副本 slice 仅入口一次。',
  inputAssumptions: '任意可比较数值；枢轴取区间右端（Lomuto）；i 语义为「已放置 ≤pivot 的最后下标」，初值 L-1。',
  statDefinitions: 'comparisons = 与 pivot 的元素比较；swaps = 元素交换次数（含枢轴就位）。',
}

/** V24 presentation: the partitioned array `a` is the primary. */
export const presentation: PresentationDescriptor = { primaryKind: 'array', primaryKey: 'a' }

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const elementIds = input.map((_, i) => `q${i}`)
  const steps: Step[] = []
  let id = 0
  let frameSeq = 0
  const DOC = 'quickSort.ts'
  const ref = (anchorId: string, role: 'primary' | 'context' = 'primary') => [
    { documentId: DOC, anchorId, role },
  ]
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
    codeRefs?: { documentId: string; anchorId: string; role?: 'primary' | 'context' | 'condition' }[],
    frameId?: string,
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
      phase,
      frameId,
      highlights: { a: highlights },
      roles: roles ? { a: roles } : undefined,
      arrays: { a: [...a] },
      elementIds: { a: [...elementIds] },
      arrayOps: arrayOps?.length ? { a: arrayOps } : undefined,
      vars,
      pointers: Object.keys(ptrs).length ? ptrs : undefined,
      stats: { comparisons, swaps },
      codeLine,
      codeRefs,
    })
  }

  function swapAt(i: number, j: number) {
    ;[a[i], a[j]] = [a[j]!, a[i]!]
    ;[elementIds[i], elementIds[j]] = [elementIds[j]!, elementIds[i]!]
  }

  function partition(L: number, R: number, frameId: string): number {
    const pivot = a[R]!
    snap(
      `选取枢轴 pivot = a[${R}] = ${pivot}`,
      [R],
      { L, R, pivot, i: L - 1 },
      2,
      { [R]: 'pivot' },
      { L, R },
      [{ type: 'compare', indices: [R], elementIds: [elementIds[R]!] }],
      'partition',
      ref('partition'),
      frameId,
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
        [{ type: 'compare', indices: [j, R], elementIds: [elementIds[j]!, elementIds[R]!] }],
        'compare',
        ref('compare'),
        frameId,
      )
      if (a[j]! <= pivot) {
        i++
        swapAt(i, j)
        swaps++
        snap(
          `a[${j}] ≤ pivot，交换 a[${i}] ↔ a[${j}]`,
          [i, j],
          { L, R, i, j, pivot },
          2,
          { [i]: 'swap', [j]: 'swap', [R]: 'pivot' },
          { L, R, i, j },
          [{ type: 'swap', indices: [i, j], elementIds: [elementIds[i]!, elementIds[j]!] }],
          'swap',
          ref('loopSwap'),
          frameId,
        )
      }
    }
    swapAt(i + 1, R)
    swaps++
    const p = i + 1
    snap(
      `枢轴就位：交换 a[${p}] ↔ a[${R}]`,
      [p, R],
      { L, R, pivot, p, i },
      2,
      { [p]: 'pivot' },
      { L, R, p },
      [{ type: 'swap', indices: [p, R], elementIds: [elementIds[p]!, elementIds[R]!] }],
      'pivotPlace',
      ref('pivotPlace'),
      frameId,
    )
    return p
  }

  function sort(L: number, R: number, depth = 0) {
    const frameId = `qs-d${depth}-L${L}-R${R}-f${frameSeq++}`
    if (L >= R) {
      snap(
        `区间 [${L},${R}] 无需划分`,
        L === R ? [L] : [],
        { L, R },
        1,
        L === R ? { [L]: 'sorted' } : undefined,
        { L, R },
        undefined,
        'recurse',
        ref('recurse'),
        frameId,
      )
      return
    }
    snap(
      `划分区间 [${L},${R}]`,
      Array.from({ length: R - L + 1 }, (_, i) => L + i),
      { L, R },
      2,
      undefined,
      { L, R },
      undefined,
      'recurse',
      ref('recurse'),
      frameId,
    )
    const p = partition(L, R, frameId)
    sort(L, p - 1, depth + 1)
    sort(p + 1, R, depth + 1)
  }

  snap('开始快速排序', [], {}, 0, undefined, undefined, undefined, 'init', ref('recurse'), `qs-root-f${frameSeq++}`)
  sort(0, a.length - 1)
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted, undefined, undefined, 'done', ref('done'))
  return steps
}
