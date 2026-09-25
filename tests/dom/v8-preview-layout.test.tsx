/**
 * V8 → V23 — tabs mode shows exactly ONE region; inactive regions are `hidden`
 * (no height, no focus) but stay mounted.
 *
 * V23 replacement note: the V8 version asserted react-resizable-panels internals
 * (`[data-panel][data-tab-active]` on the library's outer wrapper). V23 removed the
 * library from the workbench (one CSS grid), so the contract is now stated on the
 * real a11y structure: role=tab/aria-selected + role=tabpanel/hidden, for all three
 * regions (demo / data / code) instead of two.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react'
import WorkbenchLayout from './helpers/LayoutHarness'

function installRO(width: number) {
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
  return {
    fire() {
      act(() => {
        for (const { cb, el } of cbs) if (el) cb([{ target: el } as ResizeObserverEntry], {} as ResizeObserver)
      })
    },
    width,
  }
}

describe('V8/V23 tabs layout selectors', () => {
  const OriginalRO = globalThis.ResizeObserver
  afterEach(() => {
    cleanup()
    globalThis.ResizeObserver = OriginalRO
  })

  it('tabs: exactly one visible tabpanel, others hidden but mounted; tab switch moves it', () => {
    const ro = installRO(500)
    render(
      <WorkbenchLayout
        scene={<div data-testid="viz-child">viz</div>}
        data={<div data-testid="data-child">data</div>}
        code={<div data-testid="code-child">code</div>}
        transport={<div data-testid="transport-child">transport</div>}
      />,
    )
    const layout = screen.getByTestId('workbench-layout')
    Object.defineProperty(layout, 'clientWidth', { configurable: true, get: () => 500 })
    ro.fire()
    expect(layout.getAttribute('data-layout')).toBe('tabs')
    expect(layout.getAttribute('data-layout-mode')).toBe('tabbed')

    const panels = [...document.querySelectorAll('[role="tabpanel"]')]
    expect(panels.length).toBe(3)
    expect(panels.filter((p) => !p.hasAttribute('hidden')).length).toBe(1)
    expect(screen.getByTestId('workbench-viz-slot').hasAttribute('hidden')).toBe(false)
    expect(screen.getByTestId('workbench-data-slot').hasAttribute('hidden')).toBe(true)
    expect(screen.getByTestId('workbench-code-slot').hasAttribute('hidden')).toBe(true)
    for (const p of panels) {
      const tab = document.getElementById(p.getAttribute('aria-labelledby') || '')
      expect(tab?.getAttribute('role')).toBe('tab')
      expect(tab?.getAttribute('aria-selected')).toBe(p.hasAttribute('hidden') ? 'false' : 'true')
    }
    // transport is never inside a hidden panel
    expect(screen.getByTestId('transport-child').closest('[hidden]')).toBeNull()

    fireEvent.click(screen.getByTestId('workbench-tab-data'))
    expect(screen.getByTestId('workbench-data-slot').hasAttribute('hidden')).toBe(false)
    expect(screen.getByTestId('workbench-viz-slot').hasAttribute('hidden')).toBe(true)
    // all children still mounted (no remount on tab switch)
    expect(screen.getByTestId('viz-child')).toBeTruthy()
    expect(screen.getByTestId('code-child')).toBeTruthy()

    // keyboard: ArrowRight moves to code
    fireEvent.keyDown(screen.getByTestId('workbench-tab-data'), { key: 'ArrowRight' })
    expect(screen.getByTestId('workbench-code-slot').hasAttribute('hidden')).toBe(false)
  })
})
