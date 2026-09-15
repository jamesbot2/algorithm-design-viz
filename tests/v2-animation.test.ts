import { describe, expect, it } from 'vitest'
import { motion, motionCssVars, resolveDuration, speedFeelMultiplier } from '../src/theme/motion'
import { semanticColors, semanticCssVars, SEMANTIC_ROLE_LABELS } from '../src/theme/semanticColors'
import { generateSteps as kadaneSteps } from '../src/algorithms/kadane'
import { generateSteps as maxSubSteps } from '../src/algorithms/maxSubarrayDC'
import { generateSteps as bfSteps } from '../src/algorithms/bellmanFord'
import type { HighlightRole, Step } from '../src/types/step'

describe('M2 motion tokens', () => {
  it('exposes duration and easing tokens', () => {
    expect(motion.duration.fast).toBeGreaterThan(0)
    expect(motion.duration.pulse).toBeGreaterThan(motion.duration.fast)
    expect(motion.easing.standard).toContain('cubic-bezier')
  })

  it('reduced mode zeroes CSS duration vars', () => {
    const vars = motionCssVars('reduced', 600)
    expect(vars['--motion-fast']).toBe('0ms')
    expect(vars['--motion-mode']).toBe('reduced')
  })

  it('speed feel scales interval-aware durations', () => {
    expect(speedFeelMultiplier(150)).toBeLessThan(speedFeelMultiplier(900))
    expect(resolveDuration(200, 'reduced')).toBe(0)
    expect(resolveDuration(200, 'standard', 600)).toBeGreaterThan(0)
  })

  it('semantic map covers compare/focus/update/accepted/rejected/pruned/optimal/done/error', () => {
    for (const key of [
      'compare',
      'focus',
      'update',
      'accepted',
      'rejected',
      'pruned',
      'optimal',
      'done',
      'error',
    ] as const) {
      expect(semanticColors[key]).toBeTruthy()
      expect(SEMANTIC_ROLE_LABELS[key]).toBeTruthy()
    }
    const css = semanticCssVars()
    expect(css['--sem-compare']).toMatch(/^#/)
    expect(css['--sem-error']).toMatch(/^#/)
  })
})

describe('M3 ranges + neg-cycle wiring', () => {
  it('kadane steps include current/best ranges', () => {
    const steps = kadaneSteps([-2, 1, -3, 4, -1, 2, 1, -5, 4])
    const withRanges = steps.filter((s) => s.ranges?.best || s.ranges?.current)
    expect(withRanges.length).toBeGreaterThan(3)
    const last = steps[steps.length - 1]!
    expect(last.ranges?.best).toEqual([3, 6])
    expect(last.result).toMatchObject({ best: 6 })
  })

  it('maxSubarrayDC emits ranges on merge/leaf', () => {
    const steps = maxSubSteps([-2, 1, -3, 4, -1, 2, 1, -5, 4])
    expect(steps.some((s) => s.ranges?.current)).toBe(true)
    const last = steps[steps.length - 1]!
    expect(last.ranges?.best?.[0]).toBeLessThanOrEqual(last.ranges?.best?.[1] ?? -1)
  })

  it('bellmanFord neg-cycle sets graph.warning', () => {
    // Classic BF demo graph may or may not have reachable neg cycle from 0;
    // force a tiny neg-cycle graph
    const steps = bfSteps([], [[0, 1, 1], [1, 0, -2]], 2, 0)
    const warn = steps.find((s) => s.graph?.warning === 'negative_cycle')
    expect(warn).toBeTruthy()
    expect(warn!.graph?.nodeRoles?.['0'] === 'neg-cycle' || warn!.graph?.nodeRoles?.['1'] === 'neg-cycle').toBe(
      true,
    )
  })
})

describe('HighlightRole extension stays assignable', () => {
  it('accepts update/optimal roles on Step', () => {
    const step: Step = {
      id: 0,
      message: 't',
      roles: { a: { 0: 'update' as HighlightRole, 1: 'optimal' as HighlightRole } },
      ranges: { current: [0, 1], best: [0, 0] },
    }
    expect(step.roles!.a![0]).toBe('update')
  })
})
