import { describe, expect, it } from 'vitest'
import { coordinatedStepIntervalMs, decorativeMotionMs } from '../src/utils/playbackClock'

describe('V9 playback clock coordination', () => {
  it('does not advance faster than swap motion at fast play', () => {
    const speed = 100 // fast slider
    const interval = coordinatedStepIntervalMs(speed, 'standard', { hasSwapMotion: true })
    const swap = decorativeMotionMs('standard', speed, 280)
    expect(interval).toBeGreaterThanOrEqual(swap)
    expect(interval).toBeGreaterThanOrEqual(80)
  })

  it('compresses decorative phases with speed (no fixed 600 baseline desync)', () => {
    const slow = decorativeMotionMs('standard', 1200, 280)
    const fast = decorativeMotionMs('standard', 100, 280)
    expect(fast).toBeLessThan(slow)
    expect(fast).toBeGreaterThan(0)
  })

  it('reduced motion skips decorative hold', () => {
    expect(decorativeMotionMs('reduced', 100, 280)).toBe(0)
    const interval = coordinatedStepIntervalMs(100, 'reduced', { hasSwapMotion: true })
    expect(interval).toBeLessThan(decorativeMotionMs('standard', 100, 280) || 999)
  })
})
