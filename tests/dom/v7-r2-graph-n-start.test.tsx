/**
 * V7 R2 — illegal n/start must not fall back to last valid; solver must not run.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GraphInput, { type GraphValidity } from '../../src/components/graph/GraphInput'
import type { GraphDraft } from '../../src/core/graph/types'
import App from '../../src/App'
import * as runner from '../../src/core/runner/asyncRun'

const base: GraphDraft = {
  n: 3,
  start: 0,
  directed: true,
  edges: [
    [0, 1, 1],
    [1, 2, 2],
  ],
}

describe('V7 R2 GraphInput n/start', () => {
  afterEach(() => cleanup())

  const cases = ['abc', 'Infinity', 'NaN', '1e309'] as const

  for (const bad of cases) {
    it(`n=${bad} blocks canRun and does not keep showing 图校验通过 with old 3`, async () => {
      const user = userEvent.setup()
      const onValidity = vi.fn()
      render(
        <GraphInput algoId="dijkstra" value={base} onChange={vi.fn()} onValidityChange={onValidity} />,
      )
      expect(screen.getByTestId('graph-valid-ok')).toBeTruthy()
      const nInput = screen.getByTestId('graph-n')
      await user.clear(nInput)
      await user.type(nInput, bad)
      await waitFor(() => {
        const v = onValidity.mock.calls.at(-1)?.[0] as GraphValidity
        expect(v.canRun).toBe(false)
        expect(v.nError).toBeTruthy()
      })
      expect(screen.queryByTestId('graph-valid-ok')).toBeNull()
      expect(screen.getByTestId('graph-n-error')).toBeTruthy()
      expect((nInput as HTMLInputElement).getAttribute('aria-invalid')).toBe('true')
      // Raw text preserved
      expect((nInput as HTMLInputElement).value).toBe(bad)
    })

    it(`start=${bad} blocks canRun`, async () => {
      const user = userEvent.setup()
      const onValidity = vi.fn()
      render(
        <GraphInput algoId="dijkstra" value={base} onChange={vi.fn()} onValidityChange={onValidity} />,
      )
      const sInput = screen.getByTestId('graph-start')
      await user.clear(sInput)
      await user.type(sInput, bad)
      await waitFor(() => {
        const v = onValidity.mock.calls.at(-1)?.[0] as GraphValidity
        expect(v.canRun).toBe(false)
        expect(v.startError).toBeTruthy()
      })
      expect(screen.queryByTestId('graph-valid-ok')).toBeNull()
    })
  }

  it('empty n is transient not runnable; fix to legal restores canRun', async () => {
    const user = userEvent.setup()
    const onValidity = vi.fn()
    render(
      <GraphInput algoId="dijkstra" value={base} onChange={vi.fn()} onValidityChange={onValidity} />,
    )
    const nInput = screen.getByTestId('graph-n')
    await user.clear(nInput)
    await waitFor(() => expect(onValidity.mock.calls.at(-1)?.[0].canRun).toBe(false))
    await user.type(nInput, '4')
    // May need valid edges for n=4 — existing edges use 0..2 so still ok
    await waitFor(() => {
      const v = onValidity.mock.calls.at(-1)?.[0] as GraphValidity
      expect(v.nError).toBeNull()
      expect(v.canRun).toBe(true)
    })
    expect(screen.getByTestId('graph-valid-ok').textContent).toMatch(/n=4/)
  })

  it('decimal / negative / whitespace block run', async () => {
    const user = userEvent.setup()
    const onValidity = vi.fn()
    render(
      <GraphInput algoId="dijkstra" value={base} onChange={vi.fn()} onValidityChange={onValidity} />,
    )
    const nInput = screen.getByTestId('graph-n')
    for (const bad of ['3.5', '-2', '  ']) {
      await user.clear(nInput)
      if (bad.trim()) await user.type(nInput, bad)
      else await user.type(nInput, '   ')
      await waitFor(() => expect(onValidity.mock.calls.at(-1)?.[0].canRun).toBe(false))
    }
  })

  it('restore default restores raw text + canRun', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onValidity = vi.fn()
    render(
      <GraphInput algoId="dijkstra" value={base} onChange={onChange} onValidityChange={onValidity} />,
    )
    const nInput = screen.getByTestId('graph-n')
    await user.clear(nInput)
    await user.type(nInput, 'abc')
    await user.click(screen.getByTestId('graph-restore-default'))
    await waitFor(() => expect(onValidity.mock.calls.at(-1)?.[0].canRun).toBe(true))
    expect((screen.getByTestId('graph-n') as HTMLInputElement).value).not.toBe('abc')
  })
})

describe('V7 R2 solver must not run on illegal n', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/algorithm-design-viz/')
    window.location.hash = '#/algo/dijkstra'
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('illegal n submit does not call runAlgoAsync', async () => {
    const spy = vi.spyOn(runner, 'runAlgoAsync')
    const user = userEvent.setup()
    render(<App />)
    await screen.findByTestId('graph-input')
    const nInput = screen.getByTestId('graph-n')
    await user.clear(nInput)
    await user.type(nInput, 'abc')
    await waitFor(() => expect(screen.getByTestId('graph-input').getAttribute('data-can-run')).toBe('0'))
    spy.mockClear()
    await user.click(screen.getByTestId('run-btn'))
    await waitFor(() => {
      // Field or run errors must surface; solver must stay cold
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(spy).not.toHaveBeenCalled()
  })
})
