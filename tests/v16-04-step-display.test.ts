import { describe, expect, it } from 'vitest'
import { displayStepNumber, formatStepCounter } from '../src/utils/stepDisplay'

describe('V16-04 unified 1-based step counters', () => {
  it('maps 0-based idx to 1-based display', () => {
    expect(displayStepNumber(0, 10)).toBe(1)
    expect(displayStepNumber(9, 10)).toBe(10)
    expect(displayStepNumber(0, 0)).toBe(0)
  })

  it('format matches main transport style', () => {
    expect(formatStepCounter({ idx: 0, stepsLen: 5 })).toBe('1 / 5')
    expect(formatStepCounter({ idx: 4, stepsLen: 5, phase: 'relax' })).toBe('5 / 5 · relax')
    expect(formatStepCounter({ idx: 0, stepsLen: 0 })).toBe('— / —')
  })
})
