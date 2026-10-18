import type { ValidationIssue } from '../../core/trace/types'
import type { LabGrammar, LabOp } from './famTypes'

const WORD = /^[a-z]{1,6}$/

/** Typed, whitelisted op list: `name arg arg; name arg`. Never evaluated — names must be in the grammar. */
export function parseLabOps(text: string, field: string, g: LabGrammar, maxOps: number): { ok: true; value: LabOp[] } | { ok: false; issues: ValidationIssue[] } {
  const parts = text
    .split(/[;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
  const ops: LabOp[] = []
  for (let k = 0; k < parts.length; k++) {
    const tok = parts[k]!.split(/[\s,]+/).filter(Boolean)
    const t = tok[0]!
    const spec = g[t]
    const bad = (reason: string) => ({ ok: false as const, issues: [{ field, reason: `第 ${k + 1} 个操作「${parts[k]}」：${reason}`, position: k + 1, token: t }] })
    if (!spec || !Object.prototype.hasOwnProperty.call(g, t)) return bad(`未知操作（可用：${Object.keys(g).join('、')}）`)
    if (tok.length - 1 !== spec.args.length) return bad(`需要 ${spec.args.length} 个参数`)
    const op: LabOp = { t, n: [], w: [] }
    for (let a = 0; a < spec.args.length; a++) {
      const raw = tok[a + 1]!
      if (spec.args[a] === 'w') {
        if (!WORD.test(raw)) return bad(`参数「${raw}」须为 1..6 个小写字母`)
        op.w.push(raw)
      } else {
        if (!/^-?\d+$/.test(raw)) return bad(`参数「${raw}」须为整数`)
        const v = Number(raw)
        const lo = spec.lo ?? -99
        const hi = spec.hi ?? 99
        if (v < lo || v > hi) return bad(`参数 ${v} 超出范围 [${lo}, ${hi}]`)
        op.n.push(v)
      }
    }
    ops.push(op)
  }
  if (ops.length > maxOps) return { ok: false, issues: [{ field, reason: `操作至多 ${maxOps} 个（当前 ${ops.length}）` }] }
  return { ok: true, value: ops }
}

export function checkLabOps(v: unknown, field: string, g: LabGrammar, maxOps: number): { ok: true; value: LabOp[] } | { ok: false; issues: ValidationIssue[] } {
  if (!Array.isArray(v) || !v.every((o) => o && typeof o.t === 'string' && Array.isArray(o.n) && Array.isArray(o.w) && Object.prototype.hasOwnProperty.call(g, o.t))) return { ok: false, issues: [{ field, reason: '操作须为受支持的操作列表' }] }
  return parseLabOps((v as LabOp[]).map((o) => opLabel(o, g)).join('; '), field, g, maxOps)
}

export const opLabel = (o: LabOp, g: LabGrammar): string => {
  let ni = 0
  let wi = 0
  return [o.t, ...g[o.t]!.args.map((a) => (a === 'w' ? o.w[wi++]! : String(o.n[ni++]!)))].join(' ')
}

/** shared "stopped before undefined behaviour" tail */
export const stopText = (k: number, label: string, why: string) => `第 ${k} 个操作「${label}」：${why}。真实 C++ 中这是未定义行为 / 抛出异常，本实验在执行它之前停止（不画一个"确定的值"）。`
