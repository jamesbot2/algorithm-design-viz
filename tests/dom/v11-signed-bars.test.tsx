import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import ArrayView, { computeBarGeometry } from '../../src/components/ArrayView'
import { MotionProvider } from '../../src/theme/MotionContext'

function wrap(ui: Parameters<typeof render>[0]) {
  return render(<MotionProvider>{ui}</MotionProvider>)
}

describe('V11-01 ArrayView DOM bars', () => {
  it('renders zero markers with data-height 0 for [5,-5,0]', () => {
    const { container } = wrap(
      <ArrayView name="a" values={[5, -5, 0]} scaleMax={5} defaultMode="bars" />,
    )
    const zeros = container.querySelectorAll('[data-bar-zero]')
    expect(zeros.length).toBe(1)
    expect(zeros[0]?.getAttribute('data-data-height')).toBe('0')
    const pos = container.querySelector('.bar-col.pos .bar')
    const neg = container.querySelector('.bar-col.neg .bar')
    expect(pos).toBeTruthy()
    expect(neg).toBeTruthy()
    const ph = Number(pos?.getAttribute('data-data-height'))
    const nh = Number(neg?.getAttribute('data-data-height'))
    expect(ph).toBe(nh)
    expect(ph).toBeGreaterThan(0)
  })

  it('geometry helper matches DOM abs-max attr', () => {
    const g = computeBarGeometry([-3, 0, 4, -1], 4)
    const { container } = wrap(
      <ArrayView name="a" values={[-3, 0, 4, -1]} scaleMax={4} defaultMode="bars" />,
    )
    const wrapEl = container.querySelector('.bars-wrap')
    expect(wrapEl?.getAttribute('data-abs-max')).toBe(String(g.absMax))
    expect(wrapEl?.getAttribute('data-signed')).toBe('1')
  })
})
