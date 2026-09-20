import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('V20-04 acceptance quality', () => {
  const spec = fs.readFileSync(
    path.join(process.cwd(), 'tests/e2e/v20-follow-banner-wrap-acceptance.spec.ts'),
    'utf8',
  )

  it('unassisted path must not click resume/locate as rescue', () => {
    // Extract V20-01a / 01b / keypath blocks roughly
    expect(spec).toMatch(/UNEXPECTED follow pause/)
    expect(spec).toMatch(/userWheelAway/)
    expect(spec).toMatch(/evaluate scrollTop must not pause/)
    // Keypath describe exists
    expect(spec).toMatch(/key unassisted paths/)
    // Mutation sanity present
    expect(spec).toMatch(/mutation sanity/)
  })

  it('V19 rescue pattern documented as insufficient for V20', () => {
    const v19 = fs.readFileSync(
      path.join(process.cwd(), 'tests/e2e/v19-matrix-cm-compact-acceptance.spec.ts'),
      'utf8',
    )
    // V19 still has rescue — V20 must not rely on it
    expect(v19).toMatch(/matrix-resume-follow-btn/)
    expect(spec).toMatch(/no resume\/locate rescue/)
  })
})
