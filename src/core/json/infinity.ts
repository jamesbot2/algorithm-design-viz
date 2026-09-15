/**
 * Infinity encoding for JSON-safe export/import.
 *
 * Canonical object form: { "$inf": 1 } for +∞, { "$inf": -1 } for -∞
 * Alternate string form (documented, accepted on decode): "∞" / "-∞" / "+∞"
 *
 * Prefer encodeInfinity / decodeInfinity rather than mixing forms ad hoc.
 */

export type InfToken = { $inf: 1 | -1 }

export function isInfToken(v: unknown): v is InfToken {
  return (
    typeof v === 'object' &&
    v !== null &&
    '$inf' in v &&
    ((v as InfToken).$inf === 1 || (v as InfToken).$inf === -1)
  )
}

export function encodeInfinity(n: number): number | InfToken | string {
  if (n === Infinity) return { $inf: 1 }
  if (n === -Infinity) return { $inf: -1 }
  return n
}

/** Encode using string tokens ('∞' / '-∞') — alternate documented form. */
export function encodeInfinityString(n: number): number | string {
  if (n === Infinity) return '∞'
  if (n === -Infinity) return '-∞'
  return n
}

export function decodeInfinity(v: unknown): number {
  if (typeof v === 'number') return v
  if (isInfToken(v)) return v.$inf === 1 ? Infinity : -Infinity
  if (v === '∞' || v === '+∞' || v === 'Infinity') return Infinity
  if (v === '-∞' || v === '-Infinity') return -Infinity
  throw new TypeError(`Cannot decode infinity from: ${String(v)}`)
}

/** Recursively replace ±Infinity in plain data with InfToken objects. */
export function encodeInfInTree(value: unknown): unknown {
  if (typeof value === 'number') return encodeInfinity(value)
  if (Array.isArray(value)) return value.map(encodeInfInTree)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, encodeInfInTree(v)]),
    )
  }
  return value
}

/** Recursively decode InfToken / '∞' strings back to number Infinity. */
export function decodeInfInTree(value: unknown): unknown {
  if (isInfToken(value) || value === '∞' || value === '+∞' || value === '-∞') {
    return decodeInfinity(value)
  }
  if (typeof value === 'number' || typeof value === 'string' || value === null || value === undefined) {
    return value
  }
  if (Array.isArray(value)) return value.map(decodeInfInTree)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, decodeInfInTree(v)]),
    )
  }
  return value
}
