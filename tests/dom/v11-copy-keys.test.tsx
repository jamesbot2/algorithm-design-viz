import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ArraysFromStep } from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'
import { generateSteps as insertionSteps } from '../../src/algorithms/insertionSort'
import { generateSteps as mergeSteps } from '../../src/algorithms/mergeSort'

describe('V11-02 React keys unique during copy/move', () => {
  it('insertionSort mid shift step renders without duplicate-key warning', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const steps = insertionSteps([2, 1])
    const shift = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'move'))!
    render(
      <MotionProvider>
        <ArraysFromStep step={shift} prevStep={steps[steps.indexOf(shift) - 1]} />
      </MotionProvider>,
    )
    const dup = err.mock.calls.some((c) => String(c[0]).includes('same key') || String(c[0]).includes('unique'))
    expect(dup).toBe(false)
    err.mockRestore()
  })

  it('mergeSort write-back step no duplicate-key warning', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const steps = mergeSteps([4, 1, 3, 2])
    const write = steps.find((s) => s.arrayOps?.a?.some((o) => o.type === 'write'))!
    render(
      <MotionProvider>
        <ArraysFromStep step={write} prevStep={steps[Math.max(0, steps.indexOf(write) - 1)]} />
      </MotionProvider>,
    )
    const dup = err.mock.calls.some((c) => String(c[0]).toLowerCase().includes('key'))
    expect(dup).toBe(false)
    err.mockRestore()
  })
})
