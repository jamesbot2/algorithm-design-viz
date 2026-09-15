import { describe, expect, it } from 'vitest'
import { generateSteps } from '../src/algorithms/lcs'
import { pickPrimaryCodeRef, weakContextRefs } from '../src/utils/codeRefs'
import type { Step } from '../src/types/step'

describe('V5 R2 multi codeRefs + LCS micro-steps', () => {
  it('on a diagonal-write step, primary codeRef is write/takeDiagonal not only compareChars', () => {
    const steps = generateSteps([], 'AB', 'AC')
    const diagonalWrites = steps.filter(
      (s) =>
        s.vars?.match === true &&
        (s.matrixTargets?.dp?.writes?.length ?? 0) > 0 &&
        s.message.includes('dp['),
    )
    expect(diagonalWrites.length).toBeGreaterThan(0)
    for (const s of diagonalWrites) {
      const primary = pickPrimaryCodeRef(s)
      expect(primary?.anchorId).toMatch(/takeDiagonal|write|dpWrite/)
      expect(primary?.anchorId).not.toBe('compareChars')
    }
  })

  it('supports primary vs context refs on compare micro-steps', () => {
    const steps = generateSteps([], 'AB', 'AC')
    const compareOnly = steps.filter((s) =>
      s.codeRefs?.some((r) => r.anchorId === 'compareChars' && (r.role === 'primary' || !r.role)),
    )
    // After split: compare micro-step primary is compareChars; write step has context compare
    expect(compareOnly.length).toBeGreaterThan(0)
    const writeWithContext = steps.find((s) => {
      const p = pickPrimaryCodeRef(s)
      return p?.anchorId === 'takeDiagonal' && weakContextRefs(s).some((r) => r.anchorId === 'compareChars')
    })
    expect(writeWithContext).toBeTruthy()
  })

  it('pickPrimary prefers role=primary over first array item', () => {
    const step: Step = {
      id: 0,
      message: 'x',
      codeRefs: [
        { documentId: 'lcs.ts', anchorId: 'compareChars', role: 'context' },
        { documentId: 'lcs.ts', anchorId: 'takeDiagonal', role: 'primary' },
      ],
    }
    expect(pickPrimaryCodeRef(step)?.anchorId).toBe('takeDiagonal')
    expect(weakContextRefs(step).map((r) => r.anchorId)).toEqual(['compareChars'])
  })
})
