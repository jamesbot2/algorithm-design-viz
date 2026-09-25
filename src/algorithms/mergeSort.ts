import type { ArrayOp, HighlightRole, Step } from '../types/step'
import type { PresentationDescriptor } from '../types/presentation'

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
  implVersion: '1.3.0',
  timeComplexity: 'Θ(n log n)',
  spaceComplexity: 'O(n) 辅助数组 + O(log n) 栈',
  spaceNotes: '合并需要 O(n) 临时空间。',
  inputAssumptions: '任意数值数组。',
  statDefinitions: 'comparisons=归并比较；writes=写入结果次数（若统计）。',
}

/** V24 presentation: `a` is the primary; left/right are required companions; the recursion tree is a switchable auxiliary. */
export const presentation: PresentationDescriptor = {
  primaryKind: 'array',
  primaryKey: 'a',
  companions: ['left', 'right'],
  reserveCompanions: true,
  auxiliaries: [{ id: 'recursion-tree', label: '递归树' }],
  callStackVar: 'callStack',
}

function pendingId(seq: number, slot: number): string {
  return `pending:${seq}:${slot}`
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  const elementIds = input.map((_, i) => `m${i}`)
  const steps: Step[] = []
  let id = 0
  let pendingSeq = 0
  const DOC = 'mergeSort.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const PHASE_ANCHOR: Record<string, string> = {
    init: 'divide',
    divide: 'divide',
    recurse: 'recurse',
    merge: 'mergeCompare',
    split: 'divide',
    done: 'done',
  }
  let comparisons = 0
  let writes = 0
  const callStack: string[] = []
  const treeRoot: import('../types/step').SearchTreeNode = {
    id: 'ms-root',
    label: 'mergeSort',
    status: 'root',
    children: [],
  }
  const nodeStack: import('../types/step').SearchTreeNode[] = [treeRoot]
  let treeSeq = 0

  const snap = (
    message: string,
    highlights: number[] = [],
    vars: Record<string, string | number | boolean | null> = {},
    codeLine?: number,
    roles?: Record<number, HighlightRole>,
    pointers?: Record<string, number>,
    arrayOps?: ArrayOp[],
    phase?: string,
    codeRefs?: { documentId: string; anchorId: string }[],
    extraArrays?: Record<string, number[] | string[]>,
    extraIds?: Record<string, string[]>,
  ) => {
    const hasBuffers = Boolean(extraArrays && ('left' in extraArrays || 'right' in extraArrays))
    const aPtr: Record<string, number> = {}
    for (const name of ['L', 'mid', 'R', 'k'] as const) {
      const fromPtr = pointers?.[name]
      const fromVar = vars[name]
      if (typeof fromPtr === 'number' && fromPtr >= 0) aPtr[name] = fromPtr
      else if (typeof fromVar === 'number' && fromVar >= 0) aPtr[name] = fromVar
    }
    // Legacy global pointers: a-scoped only when buffers visible (avoid i/j on main a)
    const ptrs: Record<string, number> = { ...aPtr }
    if (!hasBuffers) {
      for (const name of ['i', 'j'] as const) {
        const fromPtr = pointers?.[name]
        const fromVar = vars[name]
        if (typeof fromPtr === 'number' && fromPtr >= 0) ptrs[name] = fromPtr
        else if (typeof fromVar === 'number' && fromVar >= 0) ptrs[name] = fromVar
      }
    }
    const arrayPointers: Record<string, Record<string, number>> = {}
    if (Object.keys(aPtr).length) arrayPointers.a = { ...aPtr }
    if (hasBuffers) {
      if (typeof vars.i === 'number' && (vars.i as number) >= 0) {
        arrayPointers.left = { i: vars.i as number }
      } else if (typeof pointers?.i === 'number' && pointers.i >= 0) {
        arrayPointers.left = { i: pointers.i }
      }
      if (typeof vars.j === 'number' && (vars.j as number) >= 0) {
        arrayPointers.right = { j: vars.j as number }
      } else if (typeof pointers?.j === 'number' && pointers.j >= 0) {
        arrayPointers.right = { j: pointers.j }
      }
    }
    const cloneTree = (n: import('../types/step').SearchTreeNode): import('../types/step').SearchTreeNode => ({
      ...n,
      children: n.children?.map(cloneTree),
      meta: n.meta ? { ...n.meta } : undefined,
    })
    const arrays: Record<string, number[] | string[]> = { a: [...a], ...(extraArrays ?? {}) }
    const ids: Record<string, string[]> = { a: [...elementIds], ...(extraIds ?? {}) }
    steps.push({
      id: id++,
      message,
      phase,
      highlights: { a: highlights },
      roles: roles ? { a: roles } : undefined,
      arrays,
      elementIds: ids,
      arrayOps: arrayOps?.length ? { a: arrayOps } : undefined,
      vars: { ...vars, callStack: callStack.join(' › ') || '(empty)' },
      pointers: Object.keys(ptrs).length ? ptrs : undefined,
      arrayPointers: Object.keys(arrayPointers).length ? arrayPointers : undefined,
      stats: { comparisons, writes, swaps: 0 },
      codeLine,
      codeRefs: codeRefs ?? (phase && PHASE_ANCHOR[phase] ? ref(PHASE_ANCHOR[phase]) : undefined),
      searchTree: cloneTree(treeRoot),
    })
  }

  function merge(L: number, mid: number, R: number) {
    const left = a.slice(L, mid + 1)
    const right = a.slice(mid + 1, R + 1)
    const leftIds = elementIds.slice(L, mid + 1)
    const rightIds = elementIds.slice(mid + 1, R + 1)
    // Vacate merge range so buffer ids are not aliased with main array slots
    const batch = pendingSeq++
    for (let t = L; t <= R; t++) {
      elementIds[t] = pendingId(batch, t)
    }
    snap(
      `归并区间 [${L},${mid}] 与 [${mid + 1},${R}]（抽出 left/right 缓冲）`,
      Array.from({ length: R - L + 1 }, (_, i) => L + i),
      { L, mid, R, i: 0, j: 0, k: L },
      5,
      undefined,
      { L, mid, R, k: L },
      undefined,
      'merge',
      ref('mergeCompare'),
      { left: [...left], right: [...right] },
      { left: [...leftIds], right: [...rightIds] },
    )
    let i = 0,
      j = 0,
      k = L
    while (i < left.length && j < right.length) {
      comparisons++
      snap(
        `比较 left[${i}]=${left[i]} 与 right[${j}]=${right[j]}`,
        [k],
        { L, mid, R, i, j, k },
        5,
        { [k]: 'compare' },
        { L, mid, R, k },
        [{ type: 'compare', indices: [k], elementIds: [leftIds[i]!, rightIds[j]!] }],
        'merge',
        ref('mergeCompare'),
        { left: [...left], right: [...right] },
        { left: [...leftIds], right: [...rightIds] },
      )
      const takeLeft = left[i]! <= right[j]!
      if (takeLeft) {
        a[k] = left[i]!
        elementIds[k] = leftIds[i]!
        writes++
        // Snapshot BEFORE i++/k++ so pointers match `a[k] = left[i]`
        snap(
          `写入 a[${k}] = ${a[k]}（write-back）`,
          [k],
          { L, mid, R, i, j, k },
          5,
          { [k]: 'update' },
          { L, mid, R, k },
          [{ type: 'write', indices: [k], elementIds: [elementIds[k]!] }],
          'merge',
          ref('mergeWriteLeft'),
          { left: [...left], right: [...right] },
          { left: [...leftIds], right: [...rightIds] },
        )
        i++
        k++
      } else {
        a[k] = right[j]!
        elementIds[k] = rightIds[j]!
        writes++
        snap(
          `写入 a[${k}] = ${a[k]}（write-back）`,
          [k],
          { L, mid, R, i, j, k },
          5,
          { [k]: 'update' },
          { L, mid, R, k },
          [{ type: 'write', indices: [k], elementIds: [elementIds[k]!] }],
          'merge',
          ref('mergeWriteRight'),
          { left: [...left], right: [...right] },
          { left: [...leftIds], right: [...rightIds] },
        )
        j++
        k++
      }
    }
    while (i < left.length) {
      a[k] = left[i]!
      elementIds[k] = leftIds[i]!
      writes++
      snap(
        `拷贝剩余左半 a[${k}] = ${a[k]}`,
        [k],
        { L, mid, R, i, j, k },
        5,
        { [k]: 'read' },
        { L, mid, R, k },
        [{ type: 'copy', indices: [k], elementIds: [elementIds[k]!] }],
        'merge',
        ref('mergeCopyLeft'),
        { left: [...left], right: [...right] },
        { left: [...leftIds], right: [...rightIds] },
      )
      i++
      k++
    }
    while (j < right.length) {
      a[k] = right[j]!
      elementIds[k] = rightIds[j]!
      writes++
      snap(
        `拷贝剩余右半 a[${k}] = ${a[k]}`,
        [k],
        { L, mid, R, i, j, k },
        5,
        { [k]: 'read' },
        { L, mid, R, k },
        [{ type: 'copy', indices: [k], elementIds: [elementIds[k]!] }],
        'merge',
        ref('mergeCopyRight'),
        { left: [...left], right: [...right] },
        { left: [...leftIds], right: [...rightIds] },
      )
      j++
      k++
    }
  }

  function sort(L: number, R: number) {
    const frame = `sort(${L},${R})`
    callStack.push(frame)
    const node: import('../types/step').SearchTreeNode = {
      id: `ms${treeSeq++}`,
      label: frame,
      status: 'exploring',
      children: [],
      meta: { L, R, depth: callStack.length },
    }
    const parent = nodeStack[nodeStack.length - 1]!
    parent.children = parent.children ?? []
    parent.children.push(node)
    nodeStack.push(node)

    if (L >= R) {
      node.status = 'feasible'
      snap(
        `区间 [${L},${R}] 长度 ≤ 1，返回`,
        L === R ? [L] : [],
        { L, R },
        1,
        L === R ? { [L]: 'sorted' } : undefined,
        { L, R },
        undefined,
        'split',
        ref('return'),
      )
      callStack.pop()
      nodeStack.pop()
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
      undefined,
      'split',
      ref('divide'),
    )
    sort(L, mid)
    sort(mid + 1, R)
    merge(L, mid, R)
    node.status = 'optimal'
    callStack.pop()
    nodeStack.pop()
  }

  snap('开始归并排序', [], {}, 0, undefined, undefined, undefined, 'init')
  if (a.length === 0) {
    snap('空数组，排序完成', [], {}, 0, undefined, undefined, undefined, 'done', ref('done'))
    return steps
  }
  sort(0, a.length - 1)
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted, undefined, undefined, 'done', ref('done'))
  return steps
}
