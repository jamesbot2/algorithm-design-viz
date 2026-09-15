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

export function parseIntStrict(
  text: string,
  field: string,
): { value: number | null; errors: FieldError[] } {
  const t = text.trim()
  if (t === '') {
    return { value: null, errors: [{ field, reason: '不能为空' }] }
  }
  const n = Number(t)
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return { value: null, errors: [{ field, reason: `无效数字「${t}」`, token: t }] }
  }
  return { value: n, errors: [] }
}
