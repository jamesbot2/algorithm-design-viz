import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import MatrixView from '../../src/components/MatrixView'
import type { Step } from '../../src/types/step'

afterEach(() => cleanup())

function stepWithWrite(val: number, prevVal: number): { step: Step; prev: Step } {
  const prev: Step = {
    id: 0,
    message: 'prev',
    matrices: { dp: [[prevVal, 0], [0, 0]] },
  }
  const step: Step = {
    id: 1,
    message: 'write',
    matrices: { dp: [[val, 0], [0, 0]] },
    matrixTargets: {
      dp: { current: [0, 0], writes: [[0, 0]], reads: [[0, 1]] },
    },
  }
  return { step, prev }
}

describe('V10-06 DP row height stable across writes', () => {
  it('non-involved row rect height stays within subpixel tolerance over ~30 writes', () => {
    const heights: number[] = []
    for (let i = 0; i < 30; i++) {
      const { step, prev } = stepWithWrite(i, i - 1)
      const { container, unmount } = render(<MatrixView step={step} prevStep={prev} />)
      const rows = container.querySelectorAll('tbody tr')
      expect(rows.length).toBe(2)
      const other = rows[1] as HTMLElement
      heights.push(other.getBoundingClientRect().height)
      // involved cell still carries data-prev overlay
      const cell = container.querySelector('td[data-cell="0,0"]')
      expect(cell?.getAttribute('data-prev')).toBe(String(i - 1))
      unmount()
    }
    const max = Math.max(...heights)
    const min = Math.min(...heights)
    expect(max - min).toBeLessThanOrEqual(1)
  })
})
