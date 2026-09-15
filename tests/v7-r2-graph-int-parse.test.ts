import { describe, expect, it } from 'vitest'
import { parseGraphIntField } from '../src/core/graph/validate'

describe('V7 R2 parseGraphIntField', () => {
  const bad = ['abc', 'Infinity', 'NaN', '1e309', '3.5', '3.', '-inf', '']
  for (const t of bad) {
    it(`rejects ${JSON.stringify(t)}`, () => {
      const r = parseGraphIntField(t, 'n')
      expect(r.ok).toBe(false)
      if (t.trim() === '') expect(r.transient).toBe(true)
    })
  }

  it('accepts plain integers including 0 for start', () => {
    expect(parseGraphIntField('3', 'n')).toEqual({ ok: true, value: 3 })
    expect(parseGraphIntField('0', 'start')).toEqual({ ok: true, value: 0 })
    expect(parseGraphIntField('-1', 'start')).toEqual({ ok: true, value: -1 })
  })

  it('does not trunc decimals', () => {
    const r = parseGraphIntField('3.14', 'n')
    expect(r.ok).toBe(false)
  })
})
