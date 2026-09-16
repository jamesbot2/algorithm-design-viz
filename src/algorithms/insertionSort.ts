import type { ArrayOp, HighlightRole, Step } from '../types/step'

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
  implVersion: '1.1.0',
  timeComplexity: '最坏 O(n²)，最好 O(n)',
  spaceComplexity: 'O(1)',
  spaceNotes: '原地。',
  inputAssumptions: '任意数值数组。',
  statDefinitions: 'comparisons=插入探测比较；writes=右移与插入写入。',
}

function vacantId(seq: number, slot: number): string {
  return `vacant:${seq}:${slot}`
}

export function generateSteps(input: number[]): Step[] {
  const a = [...input]
  // Slot-stable display ids start as logical element ids; never duplicate within a snapshot.
  const elementIds = input.map((_, i) => `ins${i}`)
  const steps: Step[] = []
  let id = 0
  let vacantSeq = 0
  const DOC = 'insertionSort.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  const PHASE_ANCHOR: Record<string, string> = {
    init: 'outer',
    insert: 'insert',
    shift: 'shift',
    done: 'done',
  }
  let comparisons = 0
  let writes = 0

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
    const sortedRoles: Record<number, HighlightRole> = { ...(roles ?? {}) }
    const iVar = typeof vars.i === 'number' ? vars.i : -1
    if (iVar >= 1) {
      for (let s = 0; s < iVar; s++) {
        if (!(s in sortedRoles) && !String(elementIds[s]).startsWith('vacant:')) {
          sortedRoles[s] = 'sorted'
        }
      }
    }
    const ptrs =
      pointers ??
      {
        ...(typeof vars.i === 'number' && vars.i >= 0 ? { i: vars.i as number } : {}),
        ...(typeof vars.j === 'number' && (vars.j as number) >= 0 ? { j: vars.j as number } : {}),
      }
    const arrays: Record<string, number[] | string[]> = { a: [...a], ...(extraArrays ?? {}) }
    const ids: Record<string, string[]> = { a: [...elementIds], ...(extraIds ?? {}) }
    steps.push({
      id: id++,
      message,
      phase,
      highlights: { a: highlights },
      roles: Object.keys(sortedRoles).length ? { a: sortedRoles } : undefined,
      arrays,
      elementIds: ids,
      arrayOps: arrayOps?.length ? { a: arrayOps } : undefined,
      vars: { n: a.length, ...vars },
      pointers: Object.keys(ptrs).length ? ptrs : undefined,
      stats: { comparisons, writes, swaps: 0 },
      codeLine,
      codeRefs: codeRefs ?? (phase && PHASE_ANCHOR[phase] ? ref(PHASE_ANCHOR[phase]) : undefined),
    })
  }

  snap('开始插入排序', [], {}, 0, undefined, undefined, undefined, 'init')
  for (let i = 1; i < a.length; i++) {
    const key = a[i]!
    const keyId = elementIds[i]!
    let j = i - 1
    // Lift key into temp — vacate slot i so ids stay unique during right-shifts (move, not alias).
    const hole = vacantId(vacantSeq++, i)
    a[i] = key // value retained until overwritten; identity vacated
    elementIds[i] = hole
    snap(
      `取出 key = a[${i}] = ${key} → temp`,
      [i],
      { i, j, key },
      1,
      { [i]: 'read' },
      { i, j },
      [{ type: 'compare', indices: [i], elementIds: [keyId] }],
      'insert',
      undefined,
      { temp: [key] },
      { temp: [keyId] },
    )
    while (j >= 0 && a[j]! > key) {
      comparisons++
      snap(
        `a[${j}]=${a[j]} > key=${key}，准备右移`,
        [j, j + 1],
        { i, j, key },
        3,
        { [j]: 'compare', [j + 1]: 'update' },
        { i, j },
        [{ type: 'compare', indices: [j], elementIds: [elementIds[j]!] }],
        'shift',
        undefined,
        { temp: [key] },
        { temp: [keyId] },
      )
      // Move: transfer identity to j+1; leave unique vacancy at j
      a[j + 1] = a[j]!
      elementIds[j + 1] = elementIds[j]!
      elementIds[j] = vacantId(vacantSeq++, j)
      writes++
      snap(
        `右移 a[${j + 1}] ← a[${j}]（move）`,
        [j + 1],
        { i, j, key },
        4,
        { [j + 1]: 'update' },
        { i, j },
        [{ type: 'move', indices: [j, j + 1], elementIds: [elementIds[j + 1]!] }],
        'shift',
        undefined,
        { temp: [key] },
        { temp: [keyId] },
      )
      j--
    }
    if (j >= 0) comparisons++
    a[j + 1] = key
    elementIds[j + 1] = keyId
    writes++
    snap(
      `插入 key 到位置 ${j + 1}`,
      [j + 1],
      { i, j, key },
      5,
      { [j + 1]: 'focus' },
      { i, ...(j >= 0 ? { j } : {}) },
      [{ type: 'write', indices: [j + 1], elementIds: [keyId] }],
      'insert',
      undefined,
      { temp: [key] },
      { temp: [keyId] },
    )
  }
  const allSorted: Record<number, HighlightRole> = {}
  for (let s = 0; s < a.length; s++) allSorted[s] = 'sorted'
  snap('排序完成', [], {}, 0, allSorted, undefined, undefined, 'done')
  return steps
}
