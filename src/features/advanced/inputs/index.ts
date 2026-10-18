/**
 * 高阶算法 typed inputs + parsers/validators.
 * Draft text (editing) is never a run: only `parse*` results that are `ok` may be submitted,
 * and an invalid draft never reuses the previous result.
 */
import type { ValidateResult, ValidationIssue } from '../../../core/trace/types'

export const ADV_LIMITS = {
  dsuN: 12,
  fenwickN: 16,
  segN: 16,
  ops: 24,
  boundsLen: 16,
  heapOps: 20,
  heapCap: 15,
  /** integer magnitude kept far below 2^53 so Number arithmetic is exact in traces */
  absValue: 1_000_000,
} as const

const fail = <T,>(field: string, reason: string, position?: number, token?: string): ValidateResult<T> => ({
  ok: false,
  issues: [{ field, reason, ...(position !== undefined ? { position } : {}), ...(token ? { token } : {}) }],
})

/** Strict integer token: optional sign, digits only (no 1e3, no 0x, no fractions). */
export function parseIntToken(tok: string): number | null {
  if (!/^[+-]?\d+$/.test(tok)) return null
  const n = Number(tok)
  return Number.isSafeInteger(n) && Math.abs(n) <= ADV_LIMITS.absValue ? n : null
}

// ───────── ArrayInput ─────────
export interface ArrayInput {
  arr: number[]
}
export function parseIntList(text: string, field: string, maxLen: number): ValidateResult<number[]> {
  const t = text.trim()
  if (!t) return { ok: true, value: [] }
  const issues: ValidationIssue[] = []
  const out: number[] = []
  t.split(/[,，\s]+/).filter(Boolean).forEach((tok, position) => {
    const n = parseIntToken(tok)
    if (n === null) issues.push({ field, position, token: tok, reason: `无效整数「${tok}」（仅支持 ±${ADV_LIMITS.absValue} 内的十进制整数）` })
    else out.push(n)
  })
  if (issues.length) return { ok: false, issues }
  if (out.length > maxLen) return fail(field, `长度 ${out.length} 超过演示上限 ${maxLen}`)
  return { ok: true, value: out }
}
export function validateArrayInput(raw: unknown): ValidateResult<ArrayInput> {
  const arr = (raw as { arr?: unknown } | null)?.arr
  if (!Array.isArray(arr) || !arr.every((x) => Number.isSafeInteger(x))) return fail('arr', '须为整数数组')
  return { ok: true, value: { arr: arr as number[] } }
}

// ───────── GraphInput (edge list; shared contract for graph topics) ─────────
export interface GraphInput {
  n: number
  edges: [number, number][]
  directed: boolean
}
export function validateGraphInput(raw: unknown): ValidateResult<GraphInput> {
  const g = raw as Partial<GraphInput> | null
  if (!g || !Number.isInteger(g.n) || (g.n as number) < 1 || (g.n as number) > 12) return fail('n', '顶点数须为 1..12 的整数')
  if (!Array.isArray(g.edges)) return fail('edges', '须为边数组')
  for (const [i, e] of g.edges.entries()) {
    if (!Array.isArray(e) || e.length !== 2 || !e.every((x) => Number.isInteger(x) && x >= 0 && x < (g.n as number))) {
      return fail('edges', `第 ${i + 1} 条边的端点越界（0..${(g.n as number) - 1}）`, i)
    }
  }
  return { ok: true, value: { n: g.n as number, edges: g.edges as [number, number][], directed: Boolean(g.directed) } }
}

// ───────── DSU operations ─────────
export type DsuOp = { t: 'union'; a: number; b: number } | { t: 'find'; a: number } | { t: 'same'; a: number; b: number }
export interface DsuInput {
  n: number
  ops: DsuOp[]
}
export function validateDsuInput(raw: unknown): ValidateResult<DsuInput> {
  const r = raw as Partial<DsuInput> | null
  const n = r?.n
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > ADV_LIMITS.dsuN) return fail('n', `元素数 n 须为 1..${ADV_LIMITS.dsuN} 的整数`)
  if (!Array.isArray(r?.ops)) return fail('ops', '操作须为数组')
  if (r!.ops!.length > ADV_LIMITS.ops) return fail('ops', `操作数 ${r!.ops!.length} 超过演示上限 ${ADV_LIMITS.ops}`)
  for (const [i, op] of r!.ops!.entries()) {
    const need = op?.t === 'find' ? ['a'] : op?.t === 'union' || op?.t === 'same' ? ['a', 'b'] : null
    if (!need) return fail('ops', `第 ${i + 1} 个操作类型不受支持`, i)
    for (const k of need) {
      const v = (op as unknown as Record<string, number>)[k]
      if (!Number.isInteger(v) || v < 0 || v >= (n as number)) return fail('ops', `第 ${i + 1} 个操作的元素 ${String(v)} 越界（合法 0..${(n as number) - 1}）`, i)
    }
  }
  return { ok: true, value: { n: n as number, ops: r!.ops as DsuOp[] } }
}
/** Whitelist grammar: `union a b | find a | same a b`, separated by `;` or newline. */
export function parseDsuOps(text: string): ValidateResult<DsuOp[]> {
  const ops: DsuOp[] = []
  const parts = text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)
  for (const [i, p] of parts.entries()) {
    const w = p.split(/\s+/)
    const nums = w.slice(1).map(parseIntToken)
    const kind = w[0]
    if ((kind === 'union' || kind === 'same') && w.length === 3 && nums.every((x) => x !== null)) {
      ops.push({ t: kind, a: nums[0]!, b: nums[1]! })
    } else if (kind === 'find' && w.length === 2 && nums[0] !== null) {
      ops.push({ t: 'find', a: nums[0] })
    } else {
      return fail('ops', `无法解析第 ${i + 1} 个操作「${p}」。仅支持 union a b / find a / same a b`, i, p)
    }
  }
  return { ok: true, value: ops }
}

// ───────── RangeOperationsInput (Fenwick: public API is half-open [l,r)) ─────────
export type RangeOp =
  | { t: 'add'; i: number; d: number }
  | { t: 'prefix'; r: number }
  | { t: 'range'; l: number; r: number }
export interface RangeOperationsInput {
  n: number
  ops: RangeOp[]
}
export function validateRangeOperationsInput(raw: unknown): ValidateResult<RangeOperationsInput> {
  const r = raw as Partial<RangeOperationsInput> | null
  const n = r?.n
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > ADV_LIMITS.fenwickN) return fail('n', `长度 n 须为 1..${ADV_LIMITS.fenwickN} 的整数`)
  const N = n as number
  if (!Array.isArray(r?.ops)) return fail('ops', '操作须为数组')
  if (r!.ops!.length > ADV_LIMITS.ops) return fail('ops', `操作数 ${r!.ops!.length} 超过演示上限 ${ADV_LIMITS.ops}`)
  for (const [i, op] of r!.ops!.entries()) {
    if (op?.t === 'add') {
      if (!Number.isInteger(op.i) || op.i < 0 || op.i >= N) return fail('ops', `第 ${i + 1} 个 add 的下标 ${op.i} 越界（合法 0..${N - 1}）`, i)
      if (!Number.isSafeInteger(op.d) || Math.abs(op.d) > ADV_LIMITS.absValue) return fail('ops', `第 ${i + 1} 个 add 的增量无效`, i)
    } else if (op?.t === 'prefix') {
      if (!Number.isInteger(op.r) || op.r < 0 || op.r > N) return fail('ops', `第 ${i + 1} 个 prefix(r) 的 r=${op.r} 越界（合法 0..${N}，区间为 [0,r)）`, i)
    } else if (op?.t === 'range') {
      if (!Number.isInteger(op.l) || !Number.isInteger(op.r) || op.l < 0 || op.r > N || op.l > op.r) {
        return fail('ops', `第 ${i + 1} 个 range(l,r) 须满足 0 ≤ l ≤ r ≤ ${N}（半开区间 [l,r)）`, i)
      }
    } else return fail('ops', `第 ${i + 1} 个操作类型不受支持`, i)
  }
  return { ok: true, value: { n: N, ops: r!.ops as RangeOp[] } }
}
/** Whitelist grammar: `add i d | prefix r | range l r`. */
export function parseRangeOps(text: string): ValidateResult<RangeOp[]> {
  const ops: RangeOp[] = []
  const parts = text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)
  for (const [i, p] of parts.entries()) {
    const w = p.split(/\s+/)
    const nums = w.slice(1).map(parseIntToken)
    if (w[0] === 'add' && w.length === 3 && nums.every((x) => x !== null)) ops.push({ t: 'add', i: nums[0]!, d: nums[1]! })
    else if (w[0] === 'prefix' && w.length === 2 && nums[0] !== null) ops.push({ t: 'prefix', r: nums[0] })
    else if (w[0] === 'range' && w.length === 3 && nums.every((x) => x !== null)) ops.push({ t: 'range', l: nums[0]!, r: nums[1]! })
    else return fail('ops', `无法解析第 ${i + 1} 个操作「${p}」。仅支持 add i d / prefix r / range l r`, i, p)
  }
  return { ok: true, value: ops }
}

// ───────── StlOperationsInput ─────────
export type PqOp = { t: 'push'; v: number } | { t: 'pop' } | { t: 'top' }
export interface StlOperationsInput {
  container: 'priority_queue'
  ops: PqOp[]
}
/** Whitelist grammar, C++-looking but NEVER evaluated: `push(5)`, `pop()`, `top()`. */
export function parsePqOps(text: string): ValidateResult<PqOp[]> {
  const ops: PqOp[] = []
  const parts = text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)
  for (const [i, p] of parts.entries()) {
    let m: RegExpMatchArray | null
    if ((m = p.match(/^(?:pq\.)?push\(\s*([+-]?\d+)\s*\)$/))) {
      const v = parseIntToken(m[1]!)
      if (v === null) return fail('ops', `第 ${i + 1} 个操作的值超出演示范围`, i, p)
      ops.push({ t: 'push', v })
    } else if (/^(?:pq\.)?pop\(\s*\)$/.test(p)) ops.push({ t: 'pop' })
    else if (/^(?:pq\.)?top\(\s*\)$/.test(p)) ops.push({ t: 'top' })
    else {
      return fail('ops', `不支持的语法「${p}」。本实验只接受白名单命令 push(整数) / pop() / top()，不是 C++ 编译器，也不执行任意代码。`, i, p)
    }
  }
  return { ok: true, value: ops }
}
export function validateStlOperationsInput(raw: unknown): ValidateResult<StlOperationsInput> {
  const r = raw as Partial<StlOperationsInput> | null
  if (r?.container !== 'priority_queue') return fail('container', '仅支持 priority_queue 实验')
  if (!Array.isArray(r.ops)) return fail('ops', '操作须为数组')
  if (r.ops.length > ADV_LIMITS.heapOps) return fail('ops', `操作数 ${r.ops.length} 超过演示上限 ${ADV_LIMITS.heapOps}`)
  let pushes = 0
  for (const [i, op] of r.ops.entries()) {
    if (op?.t === 'push') {
      pushes++
      if (!Number.isSafeInteger(op.v) || Math.abs(op.v) > ADV_LIMITS.absValue) return fail('ops', `第 ${i + 1} 个 push 的值无效`, i)
    } else if (op?.t !== 'pop' && op?.t !== 'top') return fail('ops', `第 ${i + 1} 个操作类型不受支持`, i)
  }
  if (pushes > ADV_LIMITS.heapCap) return fail('ops', `push 次数 ${pushes} 超过演示容量 ${ADV_LIMITS.heapCap}`)
  return { ok: true, value: { container: 'priority_queue', ops: r.ops as PqOp[] } }
}

// ───────── lower_bound / upper_bound ─────────
export interface BoundsInput {
  arr: number[]
  target: number
  mode: 'lower' | 'upper'
}
/** Precondition: [first,last) must be partitioned w.r.t. comp; for plain values: non-decreasing. */
export function validateBoundsInput(raw: unknown): ValidateResult<BoundsInput> {
  const r = raw as Partial<BoundsInput> | null
  const a = validateArrayInput(r)
  if (!a.ok) return a as ValidateResult<BoundsInput>
  const arr = a.value.arr
  if (arr.length > ADV_LIMITS.boundsLen) return fail('arr', `长度 ${arr.length} 超过演示上限 ${ADV_LIMITS.boundsLen}`)
  if (!Number.isSafeInteger(r?.target)) return fail('target', '目标值须为整数')
  if (r?.mode !== 'lower' && r?.mode !== 'upper') return fail('mode', '模式须为 lower 或 upper')
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1]! > arr[i]!) {
      return fail('arr', `前置条件不满足：序列必须按 < 非降序排列，但 a[${i - 1}]=${arr[i - 1]} > a[${i}]=${arr[i]}。已拒绝运行（不会在未排序输入上给出"查找结果"）。`, i)
    }
  }
  return { ok: true, value: { arr, target: r.target as number, mode: r.mode } }
}

// ───────── MathInput (declared for number-theory topics; BigInt-safe decimal strings) ─────────
export interface MathInput {
  a: string
  b: string
  mod?: string
}
export function validateMathInput(raw: unknown): ValidateResult<MathInput> {
  const r = raw as Partial<MathInput> | null
  const dec = (s: unknown) => typeof s === 'string' && /^-?\d{1,30}$/.test(s)
  if (!dec(r?.a) || !dec(r?.b)) return fail('a/b', '须为十进制整数字符串（≤30 位，用 BigInt 处理）')
  if (r?.mod !== undefined && (!dec(r.mod) || BigInt(r.mod) <= 0n)) return fail('mod', '模数须为正整数')
  return { ok: true, value: { a: r!.a as string, b: r!.b as string, mod: r?.mod } }
}

// ───────── SegInput (segment tree: point assign + range sum) ─────────
export type SegOp = { t: 'set'; i: number; v: number } | { t: 'sum'; l: number; r: number }
export interface SegInput {
  arr: number[]
  ops: SegOp[]
}
export function validateSegInput(raw: unknown): ValidateResult<SegInput> {
  const r = raw as Partial<SegInput> | null
  if (!Array.isArray(r?.arr)) return fail('arr', '数组须为整数列表')
  const n = r!.arr!.length
  if (n < 1 || n > ADV_LIMITS.segN) return fail('arr', `数组长度须为 1..${ADV_LIMITS.segN}`)
  if (!r!.arr!.every((x) => Number.isSafeInteger(x) && Math.abs(x) <= ADV_LIMITS.absValue)) return fail('arr', `元素须为绝对值 ≤ ${ADV_LIMITS.absValue} 的整数`)
  if (!Array.isArray(r?.ops)) return fail('ops', '操作须为数组')
  if (r!.ops!.length > ADV_LIMITS.ops) return fail('ops', `操作数 ${r!.ops!.length} 超过演示上限 ${ADV_LIMITS.ops}`)
  for (const [i, op] of r!.ops!.entries()) {
    if (op?.t === 'set') {
      if (!Number.isInteger(op.i) || op.i < 0 || op.i >= n) return fail('ops', `第 ${i + 1} 个 set 的下标 ${op.i} 越界（合法 0..${n - 1}）`, i)
      if (!Number.isSafeInteger(op.v) || Math.abs(op.v) > ADV_LIMITS.absValue) return fail('ops', `第 ${i + 1} 个 set 的值无效`, i)
    } else if (op?.t === 'sum') {
      if (!Number.isInteger(op.l) || !Number.isInteger(op.r) || op.l < 0 || op.r > n || op.l > op.r) return fail('ops', `第 ${i + 1} 个 sum(l,r) 须满足 0 ≤ l ≤ r ≤ ${n}（半开区间 [l,r)）`, i)
    } else return fail('ops', `第 ${i + 1} 个操作类型不受支持`, i)
  }
  return { ok: true, value: { arr: r!.arr as number[], ops: r!.ops as SegOp[] } }
}
/** Whitelist grammar: `set i v | sum l r`. */
export function parseSegOps(text: string): ValidateResult<SegOp[]> {
  const ops: SegOp[] = []
  const parts = text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)
  for (const [i, p] of parts.entries()) {
    const w = p.split(/\s+/)
    const nums = w.slice(1).map(parseIntToken)
    if (w[0] === 'set' && w.length === 3 && nums.every((x) => x !== null)) ops.push({ t: 'set', i: nums[0]!, v: nums[1]! })
    else if (w[0] === 'sum' && w.length === 3 && nums.every((x) => x !== null)) ops.push({ t: 'sum', l: nums[0]!, r: nums[1]! })
    else return fail('ops', `无法解析第 ${i + 1} 个操作「${p}」。仅支持 set i v / sum l r`, i, p)
  }
  return { ok: true, value: ops }
}

// ───────── LazyInput (lazy segment tree: range add + range sum) ─────────
export type LazyOp = { t: 'add'; l: number; r: number; v: number } | { t: 'sum'; l: number; r: number }
export interface LazyInput {
  arr: number[]
  ops: LazyOp[]
}
export function validateLazyInput(raw: unknown): ValidateResult<LazyInput> {
  const r = raw as Partial<LazyInput> | null
  if (!Array.isArray(r?.arr)) return fail('arr', '数组须为整数列表')
  const n = r!.arr!.length
  if (n < 1 || n > ADV_LIMITS.segN) return fail('arr', `数组长度须为 1..${ADV_LIMITS.segN}`)
  if (!r!.arr!.every((x) => Number.isSafeInteger(x) && Math.abs(x) <= ADV_LIMITS.absValue)) return fail('arr', `元素须为绝对值 ≤ ${ADV_LIMITS.absValue} 的整数`)
  if (!Array.isArray(r?.ops)) return fail('ops', '操作须为数组')
  if (r!.ops!.length > ADV_LIMITS.ops) return fail('ops', `操作数 ${r!.ops!.length} 超过演示上限 ${ADV_LIMITS.ops}`)
  for (const [i, op] of r!.ops!.entries()) {
    if (op?.t !== 'add' && op?.t !== 'sum') return fail('ops', `第 ${i + 1} 个操作类型不受支持`, i)
    if (!Number.isInteger(op.l) || !Number.isInteger(op.r) || op.l < 0 || op.r > n || op.l > op.r) return fail('ops', `第 ${i + 1} 个 ${op.t}(l,r) 须满足 0 ≤ l ≤ r ≤ ${n}（半开区间 [l,r)）`, i)
    if (op.t === 'add' && (!Number.isSafeInteger(op.v) || Math.abs(op.v) > ADV_LIMITS.absValue)) return fail('ops', `第 ${i + 1} 个 add 的增量无效`, i)
  }
  return { ok: true, value: { arr: r!.arr as number[], ops: r!.ops as LazyOp[] } }
}
/** Whitelist grammar: `add l r v | sum l r`. */
export function parseLazyOps(text: string): ValidateResult<LazyOp[]> {
  const ops: LazyOp[] = []
  const parts = text.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)
  for (const [i, p] of parts.entries()) {
    const w = p.split(/\s+/)
    const nums = w.slice(1).map(parseIntToken)
    if (w[0] === 'add' && w.length === 4 && nums.every((x) => x !== null)) ops.push({ t: 'add', l: nums[0]!, r: nums[1]!, v: nums[2]! })
    else if (w[0] === 'sum' && w.length === 3 && nums.every((x) => x !== null)) ops.push({ t: 'sum', l: nums[0]!, r: nums[1]! })
    else return fail('ops', `无法解析第 ${i + 1} 个操作「${p}」。仅支持 add l r v / sum l r`, i, p)
  }
  return { ok: true, value: ops }
}
