import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import WorkbenchLayout from '../../src/components/workbench/WorkbenchLayout'

afterEach(() => cleanup())

describe('V9 WorkbenchLayout viewport budget', () => {
  it('keeps stable panel tree and exposes measured height mode', async () => {
    const { container, getByTestId } = render(
      <div style={{ width: 800, height: 600 }}>
        <WorkbenchLayout
          viz={<div data-testid="viz-child">viz</div>}
          code={<div data-testid="code-child">code</div>}
          transport={<div>t</div>}
        />
      </div>,
    )
    const layout = getByTestId('workbench-layout')
    expect(layout.getAttribute('data-layout')).toMatch(/split|tabs/)
    expect(layout.hasAttribute('data-height-mode')).toBe(true)
    expect(getByTestId('workbench-viz-slot')).toBeTruthy()
    expect(getByTestId('workbench-code-slot')).toBeTruthy()
    // Remeasure narrow → tabs without unmounting slots
    Object.defineProperty(layout, 'clientWidth', { configurable: true, get: () => 500 })
    await act(async () => {
      layout.dispatchEvent(new Event('resize'))
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(container.querySelector('[data-testid="viz-child"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="code-child"]')).toBeTruthy()
  })
})
