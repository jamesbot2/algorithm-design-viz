/**
 * V7 R4 — crossing split/tabs breakpoint must not remount session children.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { useRef, useState } from 'react'
import WorkbenchLayout from '../../src/components/workbench/WorkbenchLayout'

let mountCount = 0

function SessionProbe({ label }: { label: string }) {
  const [n, setN] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const id = useRef(`sess-${++mountCount}`)
  return (
    <div
      data-testid={`probe-${label}`}
      data-mount-id={id.current}
      data-playing={playing ? '1' : '0'}
      data-speed={speed}
    >
      <span data-testid={`probe-${label}-n`}>{n}</span>
      <button type="button" data-testid={`probe-${label}-inc`} onClick={() => setN((x) => x + 10)}>
        +10
      </button>
      <button type="button" data-testid={`probe-${label}-play`} onClick={() => setPlaying(true)}>
        play
      </button>
      <button type="button" data-testid={`probe-${label}-speed`} onClick={() => setSpeed(200)}>
        speed
      </button>
    </div>
  )
}

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

describe('V7 R4 workbench layout persist', () => {
  const OriginalRO = globalThis.ResizeObserver
  const callbacks: { cb: ResizeObserverCallback; el?: Element }[] = []

  afterEach(() => {
    cleanup()
    mountCount = 0
    callbacks.length = 0
    globalThis.ResizeObserver = OriginalRO
  })

  it('shrinking below 720 and back keeps the same session instance + state', () => {
    globalThis.ResizeObserver = class {
      cb: ResizeObserverCallback
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
        callbacks.push({ cb })
      }
      observe(el: Element) {
        const row = callbacks.find((c) => c.cb === this.cb)
        if (row) row.el = el
        // initial wide
        this.cb([roEntry(el, 900)], this as unknown as ResizeObserver)
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    render(<WorkbenchLayout viz={<SessionProbe label="viz" />} code={<SessionProbe label="code" />} />)
    const layout = screen.getByTestId('workbench-layout')
    Object.defineProperty(layout, 'clientWidth', { configurable: true, get: () => 900 })
    act(() => {
      for (const { cb, el } of callbacks) {
        if (!el) continue
        cb([roEntry(el, 900)], {} as ResizeObserver)
      }
    })
    expect(layout.getAttribute('data-layout')).toBe('split')

    fireEvent.click(screen.getByTestId('probe-viz-inc'))
    fireEvent.click(screen.getByTestId('probe-viz-play'))
    fireEvent.click(screen.getByTestId('probe-viz-speed'))
    fireEvent.click(screen.getByTestId('probe-code-inc'))
    expect(screen.getByTestId('probe-viz-n').textContent).toBe('10')
    expect(screen.getByTestId('probe-code-n').textContent).toBe('10')
    const idViz = screen.getByTestId('probe-viz').getAttribute('data-mount-id')
    const idCode = screen.getByTestId('probe-code').getAttribute('data-mount-id')

    // No legacy dual tree
    expect(document.querySelector('.workbench-tab-panels')).toBeNull()

    act(() => {
      for (const { cb, el } of callbacks) {
        if (!el) continue
        cb([roEntry(el, 500)], {} as ResizeObserver)
      }
    })
    expect(layout.getAttribute('data-layout')).toBe('tabs')
    expect(screen.getByTestId('probe-viz').getAttribute('data-mount-id')).toBe(idViz)
    expect(screen.getByTestId('probe-code').getAttribute('data-mount-id')).toBe(idCode)
    expect(screen.getByTestId('probe-viz-n').textContent).toBe('10')
    expect(screen.getByTestId('probe-viz').getAttribute('data-playing')).toBe('1')
    expect(screen.getByTestId('probe-viz').getAttribute('data-speed')).toBe('200')

    fireEvent.click(screen.getByRole('tab', { name: '代码' }))
    fireEvent.click(screen.getByRole('tab', { name: '演示' }))
    expect(screen.getByTestId('probe-viz').getAttribute('data-mount-id')).toBe(idViz)

    act(() => {
      for (const { cb, el } of callbacks) {
        if (!el) continue
        cb([roEntry(el, 900)], {} as ResizeObserver)
      }
    })
    expect(layout.getAttribute('data-layout')).toBe('split')
    expect(screen.getByTestId('probe-viz').getAttribute('data-mount-id')).toBe(idViz)
    expect(screen.getByTestId('probe-code').getAttribute('data-mount-id')).toBe(idCode)
    expect(screen.getByTestId('probe-viz-n').textContent).toBe('10')
    expect(screen.getByTestId('probe-code-n').textContent).toBe('10')
  })
})
