/** Human-readable final answer — never dump raw JSON slice as primary UI. */
export function formatFinalAnswer(
  result: unknown,
  vars?: Record<string, string | number | boolean | null>,
): string {
  if (result == null && !vars) return '（无结果）'
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return String(result)
  }
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    const parts: string[] = []
    if ('ok' in r && r.ok === false) {
      parts.push(`失败${r.error ? `：${String(r.error)}` : ''}${r.reason ? `（${String(r.reason)}）` : ''}`)
      return parts.join('')
    }
    if ('foundIndex' in r) {
      parts.push(
        r.foundIndex == null ? '未找到目标' : `找到下标 ${String(r.foundIndex)}`,
      )
      if ('comparisons' in r) parts.push(`比较次数 ${String(r.comparisons)}`)
      return parts.join(' · ')
    }
    if ('lcs' in r || 'length' in r) {
      if ('lcs' in r) parts.push(`LCS = "${String(r.lcs)}"`)
      if ('length' in r) parts.push(`长度 ${String(r.length)}`)
      return parts.join(' · ')
    }
    if ('solutionCount' in r) {
      parts.push(`解的个数 ${String(r.solutionCount)}`)
      if (r.truncated) parts.push('（预算截断，非完整计数）')
      if (r.complete === false) parts.push('（未完成）')
      return parts.join(' ')
    }
    if ('maxValue' in r) {
      parts.push(`最大价值 ${String(r.maxValue)}`)
      if (r.truncated) parts.push('（已截断）')
      return parts.join(' ')
    }
    // Prefer a few known keys over JSON dump
    const prefer = ['answer', 'best', 'sum', 'dist', 'mstWeight', 'sorted']
    for (const k of prefer) {
      if (k in r && r[k] != null) parts.push(`${k}=${stringifyShort(r[k])}`)
    }
    if (parts.length) return parts.join(' · ')
  }
  if (vars) {
    const keys = Object.keys(vars).slice(0, 8)
    return keys.map((k) => `${k}=${String(vars[k])}`).join(' · ')
  }
  return stringifyShort(result)
}

function stringifyShort(v: unknown): string {
  try {
    const s = JSON.stringify(v)
    return s.length > 120 ? s.slice(0, 117) + '…' : s
  } catch {
    return String(v)
  }
}
