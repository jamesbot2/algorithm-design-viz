/**
 * V8 — tabs mode must collapse inactive [data-panel]; preview pane grows.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import WorkbenchLayout from '../../src/components/workbench/WorkbenchLayout'

function roEntry(target: Element, width: number): ResizeObserverEntry {
  const rect = {
    x: 0,
    y: 0,
    width,
    height: 400,
    top: 0,
    left: 0,
    bottom: 400,
    right: width,
    toJSON() {
      return this
    },
  } as DOMRectReadOnly
  return {
    target,
    contentRect: rect,
    borderBoxSize: [{ inlineSize: width, blockSize: 400 }],
    contentBoxSize: [{ inlineSize: width, blockSize: 400 }],
    devicePixelContentBoxSize: [{ inlineSize: width, blockSize: 400 }],
  } as unknown as ResizeObserverEntry
}

describe('V8 preview layout selectors', () => {
  const OriginalRO = globalThis.ResizeObserver
  const callbacks: { cb: ResizeObserverCallback; el?: Element }[] = []

  afterEach(() => {
    cleanup()
    callbacks.length = 0
    globalThis.ResizeObserver = OriginalRO
  })

  it('puts data-tab-active on [data-panel] (not on className inner) and toggles active attrs', () => {
    globalThis.ResizeObserver = class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
        callbacks.push({ cb })
      }
      observe(el: Element) {
        const row = callbacks.find((c) => c.cb === this.cb)
        if (row) row.el = el
        this.cb([roEntry(el, 500)], this as unknown as ResizeObserver)
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    render(
      <WorkbenchLayout
        viz={<div data-testid="viz-child">viz</div>}
        code={<div data-testid="code-child">code</div>}
        transport={<div data-testid="transport-child">transport</div>}
      />,
    )

    const layout = screen.getByTestId('workbench-layout')
    Object.defineProperty(layout, 'clientWidth', { configurable: true, get: () => 500 })
    act(() => {
      for (const { cb, el } of callbacks) {
        if (!el) continue
        cb([roEntry(el, 500)], {} as ResizeObserver)
      }
    })

    expect(layout.getAttribute('data-layout')).toBe('tabs')

    const panels = [...document.querySelectorAll('[data-panel]')]
    expect(panels.length).toBe(2)

    // v4 library: className is on the inner child; data-tab-active on outer [data-panel]
    for (const p of panels) {
      expect(p.classList.contains('workbench-viz-panel')).toBe(false)
      expect(p.classList.contains('workbench-code-panel')).toBe(false)
      expect(p.hasAttribute('data-tab-active')).toBe(true)
      const inner = p.firstElementChild
      expect(inner?.classList.contains('workbench-viz-panel') || inner?.classList.contains('workbench-code-panel')).toBe(
        true,
      )
    }

    const active = panels.filter((p) => p.getAttribute('data-tab-active') === '1')
    const inactive = panels.filter((p) => p.getAttribute('data-tab-active') === '0')
    expect(active.length).toBe(1)
    expect(inactive.length).toBe(1)

    // Legacy combined selector must NOT match (root cause of dual-column crush)
    expect(
      document.querySelectorAll(
        '.workbench-viz-panel[data-tab-active], .workbench-code-panel[data-tab-active]',
      ).length,
    ).toBe(0)
    // Correct selector matches outer panels
    expect(document.querySelectorAll('[data-panel][data-tab-active="1"]').length).toBe(1)
    expect(document.querySelectorAll('[data-panel][data-tab-active="0"]').length).toBe(1)

    expect(screen.getByTestId('workbench-viz-slot').hasAttribute('hidden')).toBe(false)
    expect(screen.getByTestId('workbench-code-slot').hasAttribute('hidden')).toBe(true)
  })
})
