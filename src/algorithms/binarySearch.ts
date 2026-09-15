import type { HighlightRole, Step } from '../types/step'

export type BinarySearchMode = 'requireSorted' | 'sortThenSearch'

export const meta = {
  id: 'binarySearch',
  title: '二分查找',
  complexity: '时间 O(log n)，空间 O(1)（不含可选排序）',
  description:
    '在有序数组中通过不断折半查找目标值。默认要求输入已排序；重复值返回最左（第一次）匹配。比较次数仅计 mid 与目标的值比较。',
  code: `lo = 0, hi = n-1
while lo <= hi:
  mid = (lo+hi)/2
  if a[mid] == target: return mid
  if a[mid] < target: lo = mid+1
  else: hi = mid-1`,
  defaultTarget: 7,
  defaultArray: [1, 2, 3, 5, 7, 8, 9],
  implName: 'iterativeBinarySearch',
  implVersion: '1.1.0',
  timeComplexity: 'O(log n) 次 mid 值比较；若选 sortThenSearch 另加排序代价',
  spaceComplexity: 'O(1) 辅助（迭代）；sortThenSearch 另需 O(n) 副本',
  spaceNotes: '仅维护 lo/mid/hi；不递归。',
  inputAssumptions:
    'requireSorted：数组须非降序。duplicate 策略：返回最左匹配下标。索引 0-based。',
  statDefinitions: 'comparisons = mid 位置与 target 的值比较次数（不含循环条件本身）。',
}

function isNonDecreasing(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (a[i] < a[i - 1]) return false
  }
  return true
}

function searchOnSorted(
  a: number[],
  target: number,
  steps: Step[],
  idStart: number,
  comparisonsStart: number,
  originalIndexMap?: number[],
): { steps: Step[]; id: number; comparisons: number; found: number | null } {
  let id = idStart
  let comparisons = comparisonsStart
  const DOC = 'binarySearch.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]

  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    roles?: Record<number, HighlightRole>,
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
  ) => {
    const pointers: Record<string, number> = {}
    for (const k of ['lo', 'mid', 'hi'] as const) {
      if (typeof vars[k] === 'number' && (vars[k] as number) >= 0) pointers[k] = vars[k] as number
    }
    steps.push({
      id: id++,
      message,
      highlights: { a: highlights },
      roles: roles ? { a: roles } : undefined,
      arrays: { a: [...a] },
      vars: { target, ...vars },
      pointers: Object.keys(pointers).length ? pointers : undefined,
      arrayPointers: Object.keys(pointers).length ? { a: pointers } : undefined,
      stats: { comparisons },
      codeLine,
      result,
      codeRefs,
    })
  }

  let lo = 0
  let hi = a.length - 1
  // Leftmost: when equal, continue left (hi = mid - 1) after recording candidate
  let found: number | null = null
  snap(`有序数组上二分查找 target=${target}（重复取最左）`, [], { lo, hi }, 0, undefined, undefined, ref('init'))

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    comparisons++
    snap(`mid = ${mid}，a[mid]=${a[mid]}（第 ${comparisons} 次值比较）`, [mid], { lo, mid, hi }, 2, {
      [mid]: 'focus',
    }, undefined, ref('mid'))
    if (a[mid] === target) {
      found = mid
      snap(`命中下标 ${mid}，继续向左找更早匹配`, [mid], { lo, mid, hi, candidate: mid }, 3, {
        [mid]: 'sorted',
      }, undefined, ref('compare'))
      hi = mid - 1
    } else if (a[mid] < target) {
      snap(`a[mid] < target，lo ← mid+1`, [mid], { lo, mid, hi }, 4, { [mid]: 'compare' }, undefined, ref('narrow'))
      lo = mid + 1
    } else {
      snap(`a[mid] > target，hi ← mid-1`, [mid], { lo, mid, hi }, 5, { [mid]: 'compare' }, undefined, ref('narrow'))
      hi = mid - 1
    }
  }

  if (found !== null) {
    const orig =
      originalIndexMap !== undefined ? originalIndexMap[found] : found
    snap(
      `找到！排序后下标 ${found}` +
        (originalIndexMap ? `（原数组下标 ${orig}）` : ''),
      [found],
      { lo, hi, found, originalIndex: orig },
      3,
      { [found]: 'sorted' },
      { foundIndex: found, originalIndex: orig, target, comparisons },
    )
  } else {
    snap('未找到目标', [], { lo, hi, found: null }, 0, undefined, {
      foundIndex: null,
      target,
      comparisons,
    })
  }
  return { steps, id, comparisons, found }
}

/**
 * Binary search step generator.
 * - requireSorted (default): if unsorted, emit validation error steps — NEVER silent sort.
 * - sortThenSearch: show sort phase + search; complexity separates sort + search.
 * Duplicate policy: return first (leftmost) match.
 */
export function generateSteps(
  input: number[],
  target = 7,
  mode: BinarySearchMode = 'requireSorted',
): Step[] {
  const steps: Step[] = []

  if (mode === 'requireSorted') {
    if (!isNonDecreasing(input)) {
      steps.push({
        id: 0,
        message: `输入未排序，无法在 requireSorted 模式下二分。请先排序或改用「先排序再查找」。示例：当前 [${input.join(', ')}]`,
        arrays: { a: [...input] },
        vars: { target, mode, sorted: false, error: 'unsorted' },
        result: {
          ok: false,
          error: 'unsorted',
          reason: 'requireSorted 模式禁止静默排序',
          input: [...input],
          target,
        },
      })
      return steps
    }
    searchOnSorted([...input], target, steps, 0, 0)
    return steps
  }

  // sortThenSearch
  const original = [...input]
  const indexed = original.map((value, originalIndex) => ({ value, originalIndex }))
  steps.push({
    id: 0,
    message: `模式 sortThenSearch：先对副本排序（原数组保持 [${original.join(', ')}]）`,
    arrays: { a: [...original], original: [...original] },
    vars: { target, mode, phase: 'sort' },
    stats: { comparisons: 0 },
  })
  indexed.sort((x, y) => x.value - y.value || x.originalIndex - y.originalIndex)
  const sorted = indexed.map((x) => x.value)
  const originalIndexMap = indexed.map((x) => x.originalIndex)
  steps.push({
    id: 1,
    message: `排序完成：[${sorted.join(', ')}]，原下标映射 [${originalIndexMap.join(', ')}]`,
    arrays: { a: [...sorted], original: [...original] },
    vars: {
      target,
      mode,
      phase: 'search',
      indexMap: originalIndexMap.join(','),
    },
    stats: { comparisons: 0 },
    result: { sortCostNote: '排序代价未计入下方 comparisons（仅搜索阶段 mid 比较）' },
  })
  searchOnSorted(sorted, target, steps, steps.length, 0, originalIndexMap)
  return steps
}

/** Pure check used by UI validation */
export function validateSorted(input: number[]): boolean {
  return isNonDecreasing(input)
}
