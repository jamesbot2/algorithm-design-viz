import type { Step } from '../../../types/step'
import { parseIntList, parseIntToken, ADV_LIMITS } from '../inputs'
import { advancedEntries, isAdvancedId } from '../../../algorithms/advanced/registry'

/** Ready-not-executed frames (no solve): the structure as it is BEFORE any operation. Null when the draft is unreadable. */
export function buildPreview(id: string, draft: Record<string, string>): Step | null {
  const base = { id: 0, vars: {}, phase: 'preview' } as const
  if (isAdvancedId(id) && advancedEntries[id].fields) {
    // generic family: the first frame of the pure generator (no worker solve, no counter bump) shown as "ready, not run"
    const e = advancedEntries[id]
    const p = e.parseDraft(draft)
    if (!p.ok) return null
    const first = e.solve(p.value).steps[0]
    return first ? { ...first, id: 0, phase: 'preview', message: `就绪：${first.message} 点击「运行」逐步执行。`, codeRefs: [] } : null
  }
  if (id === 'dsu') {
    const n = parseIntToken((draft.n ?? '').trim())
    if (n === null || n < 1 || n > ADV_LIMITS.dsuN) return null
    return { ...base, message: `就绪：${n} 个元素各自成集合。点击「运行」执行操作序列。`, advanced: { kind: 'dsu', n, parent: Array.from({ length: n }, (_, i) => i), size: new Array<number>(n).fill(1), components: n, op: '预览' } }
  }
  if (id === 'fenwick') {
    const n = parseIntToken((draft.n ?? '').trim())
    if (n === null || n < 1 || n > ADV_LIMITS.fenwickN) return null
    return { ...base, message: `就绪：长度 ${n} 的全 0 数组。点击「运行」执行操作序列。`, advanced: { kind: 'fenwick', n, tree: new Array<number>(n).fill(0), values: new Array<number>(n).fill(0), op: '预览', path: [] } }
  }
  if (id === 'segtree' || id === 'segtree-lazy') {
    const arr = parseIntList(draft.arr ?? '', 'arr', ADV_LIMITS.segN)
    if (!arr.ok || arr.value.length < 1) return null
    const n = arr.value.length
    return { ...base, message: `就绪：数组长度 ${n}，线段树尚未建立。点击「运行」先建树再执行操作序列。`, advanced: { kind: 'seg', n, tree: new Array<number | null>(4 * n).fill(null), op: '预览', visited: [], ...(id === 'segtree-lazy' ? { lazy: new Array<number>(4 * n).fill(0) } : {}) } }
  }
  if (id === 'stl-priority-queue') {
    return { ...base, message: '就绪：空的 priority_queue。点击「运行」执行操作序列。', advanced: { kind: 'heap', heap: [], cap: 1, op: '预览' } }
  }
  if (id === 'stl-bounds') {
    const arr = parseIntList(draft.arr ?? '', 'arr', ADV_LIMITS.boundsLen)
    const t = parseIntToken((draft.target ?? '').trim())
    if (!arr.ok || t === null) return null
    const mode = draft.mode === 'upper' ? 'upper' : 'lower'
    return { ...base, message: '就绪：在闭开区间 [0,n) 上二分。点击「运行」开始。', advanced: { kind: 'bounds', arr: arr.value, target: t, mode, first: 0, last: arr.value.length } }
  }
  return null
}
