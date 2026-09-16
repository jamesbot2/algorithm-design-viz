export interface FieldError {
  field: string
  position?: number
  reason: string
  token?: string
}

/** Parse comma/space-separated numbers. Does NOT silently drop invalid tokens. */
export function parseNumberList(
  text: string,
  field = 'array',
  opts?: { allowEmpty?: boolean; maxLen?: number },
): { values: number[]; errors: FieldError[] } {
  const allowEmpty = opts?.allowEmpty ?? true
  const trimmed = text.trim()
  if (!trimmed) {
    if (allowEmpty) return { values: [], errors: [] }
    return { values: [], errors: [{ field, reason: '不能为空' }] }
  }
  const tokens = trimmed.split(/[,，\s]+/).filter((t) => t.length > 0)
  const values: number[] = []
  const errors: FieldError[] = []
  tokens.forEach((token, position) => {
    const n = Number(token)
    if (token === '' || Number.isNaN(n)) {
      errors.push({ field, position, reason: `无效数字「${token}」`, token })
    } else {
      values.push(n)
    }
  })
  if (opts?.maxLen !== undefined && values.length > opts.maxLen) {
    errors.push({
      field,
      reason: `长度 ${values.length} 超过演示上限 ${opts.maxLen}`,
    })
  }
  return { values, errors }
}

/**
 * Parse a single number. Rejects NaN / non-finite (incl. Infinity).
 * Does NOT require integer — use assertNonNegIntegers / parseNonNegInt for discrete DP.
 */
export function parseIntStrict(
  text: string,
  field: string,
): { value: number | null; errors: FieldError[] } {
  const t = text.trim()
  if (t === '') {
    return { value: null, errors: [{ field, reason: '不能为空' }] }
  }
  // Explicit Infinity tokens (Number('Infinity') is finite-check fail)
  if (/^[+-]?Infinity$/i.test(t) || t === 'NaN') {
    return { value: null, errors: [{ field, reason: `无效数字「${t}」（非有限数）`, token: t }] }
  }
  const n = Number(t)
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { value: null, errors: [{ field, reason: `无效数字「${t}」`, token: t }] }
  }
  return { value: n, errors: [] }
}

/** Non-negative integer scalar (capacity W, counts, …). */
export function parseNonNegInt(
  text: string,
  field: string,
): { value: number | null; errors: FieldError[] } {
  const base = parseIntStrict(text, field)
  if (base.errors.length || base.value === null) return base
  if (!Number.isInteger(base.value) || base.value < 0) {
    return {
      value: null,
      errors: [{ field, reason: `须为非负整数，收到「${text.trim()}」`, token: text.trim() }],
    }
  }
  return base
}

/** Assert each value is a non-negative integer (weights/values for discrete knapsack). */
export function assertNonNegIntegers(
  values: number[],
  field: string,
  opts?: { allowZero?: boolean },
): FieldError[] {
  const allowZero = opts?.allowZero ?? true
  const errors: FieldError[] = []
  values.forEach((v, position) => {
    if (!Number.isFinite(v)) {
      errors.push({ field, position, reason: `非有限数`, token: String(v) })
      return
    }
    if (!Number.isInteger(v)) {
      errors.push({ field, position, reason: `须为整数，收到 ${v}`, token: String(v) })
      return
    }
    if (allowZero ? v < 0 : v <= 0) {
      errors.push({
        field,
        position,
        reason: allowZero ? `须为非负整数，收到 ${v}` : `须为正整数，收到 ${v}`,
        token: String(v),
      })
    }
  })
  return errors
}
