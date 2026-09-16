import { describe, expect, it } from 'vitest'
import { dpCellClassNames } from '../src/utils/dpCellRoles'

describe('V9 DP composable cell roles', () => {
  it('keeps write + focus together (no early current swallow)', () => {
    const cls = dpCellClassNames(1, 2, {
      current: [1, 2],
      writes: [[1, 2]],
      reads: [[1, 1]],
      path: [[1, 2]],
    })
    expect(cls).toContain('hl-focus')
    expect(cls).toContain('hl-write')
    expect(cls).toContain('hl-path')
  })

  it('still marks reads when not current', () => {
    const cls = dpCellClassNames(0, 1, {
      current: [2, 2],
      reads: [[0, 1]],
    })
    expect(cls).toBe('hl-read')
  })
})
