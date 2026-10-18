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
  parseLazyOps,
  validateLazyInput,
  validateSegInput,
  parseIntToken,
  ADV_LIMITS,
} from '../../features/advanced/inputs'
import * as dsu from './dsu'
import * as fenwick from './fenwick'
import * as segtree from './segtree'
import * as segtreeLazy from './segtreeLazy'
import * as stlBounds from './stlBounds'
import * as stlPq from './stlPriorityQueue'
import type { FamId, FamInput, FamSpec } from './famTypes'
import { FAMILIES } from './families'

export type AdvancedAlgoId = FamId | 'dsu' | 'fenwick' | 'segtree' | 'segtree-lazy' | 'stl-bounds' | 'stl-priority-queue'

export interface AdvancedEntry {
  id: AdvancedAlgoId
  meta: { id: string; title: string; complexity: string; description: string; implName: string; implVersion: string; docId: string }
  /** catalog id of the code documents shown for this demo (src/codeCatalog/<catalogId>) */
  catalogId: string
  languages: 'six' | 'cpp-only'
  /** generic family: field definitions used to render the draft form */
  fields?: FamSpec['fields']
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

function famEntry(spec: FamSpec): AdvancedEntry {
  const checkTyped = (raw: unknown): ValidateResult<FamInput> => {
    const r = (raw ?? {}) as Record<string, unknown>
    const out: FamInput = {}
    for (const f of spec.fields) {
      const v = r[f.key]
      if (f.kind === 'int') {
        if (typeof v !== 'number' || !Number.isSafeInteger(v) || Math.abs(v) > ADV_LIMITS.absValue) return issue(f.key, `${f.label} 须为整数（绝对值 ≤ ${ADV_LIMITS.absValue}）`)
        if (f.min !== undefined && v < f.min) return issue(f.key, `${f.label} 须 ≥ ${f.min}`)
        if (f.max !== undefined && v > f.max) return issue(f.key, `${f.label} 须 ≤ ${f.max}`)
        out[f.key] = v
      } else {
        if (!Array.isArray(v) || !v.every((x) => Number.isSafeInteger(x) && Math.abs(x as number) <= ADV_LIMITS.absValue)) return issue(f.key, `${f.label} 须为整数列表`)
        const a = v as number[]
        if (a.length < (f.minLen ?? 0) || a.length > (f.maxLen ?? 16)) return issue(f.key, `${f.label} 长度须为 ${f.minLen ?? 0}..${f.maxLen ?? 16}`)
        const bad = a.findIndex((x) => (f.min !== undefined && x < f.min) || (f.max !== undefined && x > f.max))
        if (bad >= 0) return issue(f.key, `${f.label} 的第 ${bad + 1} 项 ${a[bad]} 超出范围 [${f.min ?? '-∞'}, ${f.max ?? '+∞'}]`)
        out[f.key] = a
      }
    }
    const c = spec.check?.(out)
    if (c) return issue(c.field, c.reason)
    return { ok: true, value: out }
  }
  return {
    id: spec.id,
    meta: spec.meta,
    catalogId: spec.catalogId,
    languages: 'six',
    fields: spec.fields,
    presentation: ADV,
    defaultDraft: spec.defaultDraft,
    parseDraft: (d) => {
      const typed: Record<string, unknown> = {}
      const issues: ValidationIssue[] = []
      for (const f of spec.fields) {
        if (f.kind === 'int') {
          const n = parseIntToken((d[f.key] ?? '').trim())
          if (n === null) issues.push({ field: f.key, reason: `${f.label} 须为整数` })
          else typed[f.key] = n
        } else {
          const l = parseIntList(d[f.key] ?? '', f.key, f.maxLen ?? 16)
          if (!l.ok) issues.push(...l.issues)
          else typed[f.key] = l.value
        }
      }
      if (issues.length) return { ok: false, issues }
      return checkTyped(typed)
    },
    validate: checkTyped,
    solve: (i) => spec.generate(i as FamInput),
  }
}

export const advancedEntries: Record<AdvancedAlgoId, AdvancedEntry> = {
  ...(Object.fromEntries(FAMILIES.map((f) => [f.id, famEntry(f)])) as Record<FamId, AdvancedEntry>),
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
  'segtree-lazy': {
    id: 'segtree-lazy',
    meta: segtreeLazy.meta,
    catalogId: 'segtree_lazy',
    languages: 'six',
    presentation: ADV,
    defaultDraft: { arr: segtreeLazy.meta.defaultArr, ops: segtreeLazy.meta.defaultOps },
    parseDraft: (d) => {
      const arr = parseIntList(d.arr ?? '', 'arr', ADV_LIMITS.segN)
      if (!arr.ok) return arr
      const ops = parseLazyOps(d.ops ?? '')
      if (!ops.ok) return ops
      return validateLazyInput({ arr: arr.value, ops: ops.value })
    },
    validate: validateLazyInput,
    solve: (i) => segtreeLazy.generateLazySteps(i as Parameters<typeof segtreeLazy.generateLazySteps>[0]),
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
