/**
 * Small compat adapter: typed advanced algorithms behind the same `{id, meta, generateSteps}` shape the
 * legacy registry uses (so old modules are NOT rewritten), plus typed `validate`/`solve`.
 * The Worker (core/runner/heavySolve.worker.ts) calls `solveAdvanced` — registration here IS the
 * Worker registration.
 */
import type { Step } from '../../types/step'
import type { ValidateResult, ValidationIssue } from '../../core/trace/types'
import type { PresentationDescriptor } from '../../types/presentation'
import {
  validateDsuInput,
  validateRangeOperationsInput,
  validateBoundsInput,
  validateStlOperationsInput,
  parseDsuOps,
  parseRangeOps,
  parsePqOps,
  parseIntList,
  parseSegOps,
  validateSegInput,
  parseIntToken,
  ADV_LIMITS,
} from '../../features/advanced/inputs'
import * as dsu from './dsu'
import * as fenwick from './fenwick'
import * as segtree from './segtree'
import * as stlBounds from './stlBounds'
import * as stlPq from './stlPriorityQueue'

export type AdvancedAlgoId = 'dsu' | 'fenwick' | 'segtree' | 'stl-bounds' | 'stl-priority-queue'

export interface AdvancedEntry {
  id: AdvancedAlgoId
  meta: { id: string; title: string; complexity: string; description: string; implName: string; implVersion: string; docId: string }
  /** catalog id of the code documents shown for this demo (src/codeCatalog/<catalogId>) */
  catalogId: string
  languages: 'six' | 'cpp-only'
  presentation: PresentationDescriptor
  /** draft text fields → typed input (the only way a run input is produced) */
  parseDraft: (draft: Record<string, string>) => ValidateResult<unknown>
  defaultDraft: Record<string, string>
  validate: (raw: unknown) => ValidateResult<unknown>
  solve: (input: unknown) => { steps: Step[]; result: unknown }
}

const issue = (field: string, reason: string): ValidateResult<never> => ({ ok: false, issues: [{ field, reason }] })
const merge = <T,>(...rs: ValidateResult<unknown>[]): ValidationIssue[] | null => {
  const all = rs.flatMap((r) => (r.ok ? [] : r.issues))
  void (null as T | null)
  return all.length ? all : null
}

const ADV: PresentationDescriptor = { primaryKind: 'advanced' }

export const advancedEntries: Record<AdvancedAlgoId, AdvancedEntry> = {
  dsu: {
    id: 'dsu',
    meta: dsu.meta,
    catalogId: 'dsu',
    languages: 'six',
    presentation: ADV,
    defaultDraft: { n: String(dsu.meta.defaultN), ops: dsu.meta.defaultOps },
    parseDraft: (d) => {
      const n = parseIntToken((d.n ?? '').trim())
      if (n === null) return issue('n', 'n 须为整数')
      const ops = parseDsuOps(d.ops ?? '')
      if (!ops.ok) return ops
      return validateDsuInput({ n, ops: ops.value })
    },
    validate: validateDsuInput,
    solve: (i) => dsu.generateDsuSteps(i as Parameters<typeof dsu.generateDsuSteps>[0]),
  },
  fenwick: {
    id: 'fenwick',
    meta: fenwick.meta,
    catalogId: 'fenwick',
    languages: 'six',
    presentation: ADV,
    defaultDraft: { n: String(fenwick.meta.defaultN), ops: fenwick.meta.defaultOps },
    parseDraft: (d) => {
      const n = parseIntToken((d.n ?? '').trim())
      if (n === null) return issue('n', 'n 须为整数')
      const ops = parseRangeOps(d.ops ?? '')
      if (!ops.ok) return ops
      return validateRangeOperationsInput({ n, ops: ops.value })
    },
    validate: validateRangeOperationsInput,
    solve: (i) => fenwick.generateFenwickSteps(i as Parameters<typeof fenwick.generateFenwickSteps>[0]),
  },
  segtree: {
    id: 'segtree',
    meta: segtree.meta,
    catalogId: 'segtree',
    languages: 'six',
    presentation: ADV,
    defaultDraft: { arr: segtree.meta.defaultArr, ops: segtree.meta.defaultOps },
    parseDraft: (d) => {
      const arr = parseIntList(d.arr ?? '', 'arr', ADV_LIMITS.segN)
      if (!arr.ok) return arr
      const ops = parseSegOps(d.ops ?? '')
      if (!ops.ok) return ops
      return validateSegInput({ arr: arr.value, ops: ops.value })
    },
    validate: validateSegInput,
    solve: (i) => segtree.generateSegSteps(i as Parameters<typeof segtree.generateSegSteps>[0]),
  },
  'stl-bounds': {
    id: 'stl-bounds',
    meta: stlBounds.meta,
    catalogId: 'stl_bounds',
    languages: 'cpp-only',
    presentation: ADV,
    defaultDraft: { arr: stlBounds.meta.defaultArr, target: String(stlBounds.meta.defaultTarget), mode: 'lower' },
    parseDraft: (d) => {
      const arr = parseIntList(d.arr ?? '', 'arr', ADV_LIMITS.boundsLen)
      const t = parseIntToken((d.target ?? '').trim())
      const bad = merge(arr, t === null ? issue('target', '目标值须为整数') : { ok: true, value: 0 })
      if (bad) return { ok: false, issues: bad }
      return validateBoundsInput({ arr: (arr as { value: number[] }).value, target: t, mode: d.mode })
    },
    validate: validateBoundsInput,
    solve: (i) => stlBounds.generateBoundsSteps(i as Parameters<typeof stlBounds.generateBoundsSteps>[0]),
  },
  'stl-priority-queue': {
    id: 'stl-priority-queue',
    meta: stlPq.meta,
    catalogId: 'stl_priority_queue',
    languages: 'cpp-only',
    presentation: ADV,
    defaultDraft: { ops: stlPq.meta.defaultOps },
    parseDraft: (d) => {
      const ops = parsePqOps(d.ops ?? '')
      if (!ops.ok) return ops
      return validateStlOperationsInput({ container: 'priority_queue', ops: ops.value })
    },
    validate: validateStlOperationsInput,
    solve: (i) => stlPq.generatePqSteps(i as Parameters<typeof stlPq.generatePqSteps>[0]),
  },
}

export const advancedIds = Object.keys(advancedEntries) as AdvancedAlgoId[]
export const isAdvancedId = (id: string | undefined): id is AdvancedAlgoId => !!id && id in advancedEntries

/** Worker + page entry: validate then solve (one solve per call). */
export function solveAdvanced(
  id: string,
  raw: unknown,
): { ok: true; steps: Step[]; result: unknown } | { ok: false; issues: ValidationIssue[] } {
  if (!isAdvancedId(id)) return { ok: false, issues: [{ field: 'id', reason: `未注册的高阶算法 ${id}` }] }
  const e = advancedEntries[id]
  const v = e.validate(raw)
  if (!v.ok) return { ok: false, issues: v.issues }
  const r = e.solve(v.value)
  return { ok: true, steps: r.steps, result: r.result }
}

/** Legacy-shaped adapter (`generateSteps(number[], ...any)`): runs the default draft; ignores the array. */
export function legacyGenerateSteps(id: AdvancedAlgoId): (arr: number[]) => Step[] {
  return () => {
    const e = advancedEntries[id]
    const p = e.parseDraft(e.defaultDraft)
    if (!p.ok) throw new Error(p.issues[0]!.reason)
    return e.solve(p.value).steps
  }
}
