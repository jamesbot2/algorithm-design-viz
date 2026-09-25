/**
 * V9 → V23 WorkbenchLayout budget.
 * V23 replacement note: V9 asserted `data-height-mode` (the removed fill/scroll
 * height-fallback protocol). V23 exposes ONE resolved mode from the real container
 * budget: data-layout-mode ∈ docked|wide|tabbed, and the slot tree is stable across
 * remeasure (asserted by identity, stronger than presence).
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import WorkbenchLayout from './helpers/LayoutHarness'
import { resolveLayoutMode } from '../../src/components/workbench/layoutModel'

afterEach(() => cleanup())

describe('V9/V23 WorkbenchLayout viewport budget', () => {
  it('keeps stable slot tree and exposes the resolved layout mode', async () => {
    const OriginalRO = globalThis.ResizeObserver
    const cbs: { cb: ResizeObserverCallback; el?: Element }[] = []
    globalThis.ResizeObserver = class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
        cbs.push({ cb })
      }
      observe(el: Element) {
        const row = cbs.find((c) => c.cb === this.cb)
        if (row) row.el = el
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    try {
      const { container, getByTestId } = render(
        <WorkbenchLayout
          scene={<div data-testid="viz-child">viz</div>}
          data={<div data-testid="data-child">data</div>}
          code={<div data-testid="code-child">code</div>}
          transport={<div>t</div>}
        />,
      )
      const layout = getByTestId('workbench-layout')
      const fire = (w: number) => {
        Object.defineProperty(layout, 'clientWidth', { configurable: true, get: () => w })
        act(() => {
          for (const { cb, el } of cbs) if (el) cb([{ target: el } as ResizeObserverEntry], {} as ResizeObserver)
        })
      }
      const vizChild = container.querySelector('[data-testid="viz-child"]')
      const codeChild = container.querySelector('[data-testid="code-child"]')
      fire(1100)
      expect(layout.getAttribute('data-layout-mode')).toBe('docked')
      expect(layout.getAttribute('data-layout')).toBe('split')
      fire(1700)
      expect(layout.getAttribute('data-layout-mode')).toBe('wide')
      fire(500)
      expect(layout.getAttribute('data-layout-mode')).toBe('tabbed')
      expect(layout.getAttribute('data-layout')).toBe('tabs')
      expect(layout.hasAttribute('data-height-mode')).toBe(false)
      expect(container.querySelector('[data-testid="viz-child"]')).toBe(vizChild)
      expect(container.querySelector('[data-testid="code-child"]')).toBe(codeChild)
    } finally {
      globalThis.ResizeObserver = OriginalRO
    }
  })

  it('mode is a pure function of container width + scroll-viewport height', () => {
    expect(resolveLayoutMode({ width: 1100, viewportHeight: 700 })).toBe('docked')
    expect(resolveLayoutMode({ width: 1700, viewportHeight: 900 })).toBe('wide')
    expect(resolveLayoutMode({ width: 700, viewportHeight: 900 })).toBe('tabbed')
    expect(resolveLayoutMode({ width: 1100, viewportHeight: 400 })).toBe('tabbed')
  })
})
