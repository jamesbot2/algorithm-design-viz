import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import MatrixView from '../../src/components/MatrixView'
import type { Step } from '../../src/types/step'

afterEach(() => cleanup())

describe('V9 MatrixView composable feedback', () => {
  it('shows write class concurrent with focus; prev from real prev step', () => {
    const prev: Step = {
      id: 0,
      message: 'prev',
      matrices: { dp: [[0, 1], [2, 3]] },
    }
    const step: Step = {
      id: 1,
      message: 'write',
      matrices: { dp: [[0, 1], [2, 9]] },
      matrixTargets: {
        dp: { current: [1, 1], writes: [[1, 1]], reads: [[1, 0]] },
      },
    }
    const { container } = render(<MatrixView step={step} prevStep={prev} />)
    const cell = container.querySelector('td[data-cell="1,1"]') as HTMLElement
    expect(cell).toBeTruthy()
    expect(cell.className).toMatch(/hl-focus/)
    expect(cell.className).toMatch(/hl-write/)
    expect(cell.getAttribute('data-prev')).toBe('3')
    expect(cell.textContent).toContain('9')
  })
})
