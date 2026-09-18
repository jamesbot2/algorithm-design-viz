import { describe, expect, it } from 'vitest'
import { coordinatedStepIntervalMs, decorativeMotionMs } from '../src/utils/playbackClock'
import { generateSteps } from '../src/algorithms/insertionSort'

describe('V12-03 move clock budgets FLIP', () => {
  it('move motion gets same floor as swap motion', () => {
    const speed = 100
    const swap = coordinatedStepIntervalMs(speed, 'standard', { hasSwapMotion: true })
    const move = coordinatedStepIntervalMs(speed, 'standard', { hasMoveMotion: true })
    const motion = decorativeMotionMs('standard', speed, 280)
    expect(move).toBeGreaterThanOrEqual(motion)
    expect(move).toBe(swap)
  })

  it('insertion [5,4,3,2,1] emits move ops', () => {
    const steps = generateSteps([5, 4, 3, 2, 1])
    const moves = steps.filter((s) => s.arrayOps?.a?.some((o) => o.type === 'move'))
    expect(moves.length).toBeGreaterThan(0)
  })
})
