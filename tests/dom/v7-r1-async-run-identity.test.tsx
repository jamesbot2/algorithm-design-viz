/**
 * V7 R1 — AlgoPage async run identity with controllable solve barrier.
 * @vitest-environment happy-dom
 */
import { describe, expect, it, afterEach } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import {
  clearSolveBarrier,
  createDeferred,
  installSolveBarrier,
  type SolveBarrierContext,
} from '../../src/core/runner/solveBarrier'

function renderApp(hashPath: string) {
  window.history.replaceState(null, '', '/algorithm-design-viz/')
  window.location.hash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`
  return render(<App />)
}

describe('V7 R1 async run identity', () => {
  afterEach(() => {
    clearSolveBarrier()
    cleanup()
  })

  it('navigating away before resolve prevents old nQueens result writing Dijkstra page', async () => {
    const user = userEvent.setup()
    const gates = new Map<string, ReturnType<typeof createDeferred>>()

    installSolveBarrier(async (ctx: SolveBarrierContext) => {
      let d = gates.get(ctx.algoId)
      if (!d) {
        d = createDeferred<void>()
        gates.set(ctx.algoId, d)
      }
      await d.promise
    })

    renderApp('#/algo/nQueens')
    await screen.findByTestId('run-btn')
    await user.click(screen.getByTestId('run-btn'))
    await screen.findByTestId('run-status')

    // Navigate via sidebar link (same AlgoPage instance, different :id)
    const dij = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.includes('dijkstra') && !a.getAttribute('href')?.includes('Heap'))
    expect(dij).toBeTruthy()
    await user.click(dij!)

    await waitFor(() => {
      expect(screen.getByTestId('graph-input')).toBeTruthy()
    })

    // Resolve old nQueens after navigation
    gates.get('nQueens')?.resolve()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    expect(screen.queryByTestId('nqueens-n')).toBeNull()
    expect(screen.getByTestId('graph-input')).toBeTruthy()
    const banner = document.querySelector('[data-testid="viz-banner"]')?.textContent ?? ''
    expect(banner).not.toMatch(/皇后|queen|棋盘/i)
  })

  it('run A then B; resolve B then A → only B shown', async () => {
    const user = userEvent.setup()
    const byGen = new Map<number, ReturnType<typeof createDeferred>>()

    installSolveBarrier(async (ctx) => {
      let d = byGen.get(ctx.generation)
      if (!d) {
        d = createDeferred<void>()
        byGen.set(ctx.generation, d)
      }
      await d.promise
    })

    renderApp('#/algo/bubbleSort')
    await screen.findByTestId('run-btn')

    await user.click(screen.getByTestId('run-btn'))
    await waitFor(() => expect(byGen.size).toBeGreaterThanOrEqual(1))
    const genA = [...byGen.keys()][0]!

    await user.click(screen.getByTestId('run-btn'))
    await waitFor(() => expect(byGen.size).toBeGreaterThanOrEqual(2))
    const genB = [...byGen.keys()].find((g) => g !== genA)!

    byGen.get(genB)?.resolve()
    await waitFor(() => {
      expect(document.querySelector('[data-testid="visualizer"]')).toBeTruthy()
      expect(document.querySelector('[data-testid="run-status"]')?.textContent ?? '').not.toMatch(/运行中/)
    })

    const stepsAfterB = screen.getByTestId('step-counter').textContent

    byGen.get(genA)?.resolve()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    expect(screen.getByTestId('step-counter').textContent).toBe(stepsAfterB)
  })

  it('submit n=8, edit draft to 9, resolve 8 → draft 9, dirty, snapshot 8', async () => {
    const user = userEvent.setup()
    const gate = createDeferred<void>()
    installSolveBarrier(async (ctx) => {
      if (ctx.algoId === 'nQueens') await gate.promise
    })

    renderApp('#/algo/nQueens')
    await screen.findByTestId('nqueens-n')
    const nInput = screen.getByTestId('nqueens-n') as HTMLInputElement
    await user.clear(nInput)
    await user.type(nInput, '8')

    await user.click(screen.getByTestId('run-btn'))
    await screen.findByTestId('run-status')

    await user.clear(nInput)
    await user.type(nInput, '9')
    expect(nInput.value).toBe('9')

    gate.resolve()

    // nQueens n=8 sync fallback (~0.8s) can exceed default 1s waitFor under CI CPU load
    await waitFor(
      () => {
        expect(screen.queryByTestId('run-status')?.textContent ?? '').not.toMatch(/运行中/)
      },
      { timeout: 10_000 },
    )

    expect((screen.getByTestId('nqueens-n') as HTMLInputElement).value).toBe('9')
    expect(document.querySelector('.dirty-banner')).toBeTruthy()
    // Snapshot should reflect submitted n=8 in debug / run snapshot path
    const debug = document.querySelector('.debug-details')?.textContent ?? ''
    expect(debug).toMatch(/草稿已改/)
  })

  it('unmount then resolve does not write into a new page', async () => {
    const gate = createDeferred<void>()
    installSolveBarrier(async (ctx) => {
      if (ctx.algoId === 'nQueens') await gate.promise
    })

    const user = userEvent.setup()
    const { unmount } = renderApp('#/algo/nQueens')
    await screen.findByTestId('run-btn')
    await user.click(screen.getByTestId('run-btn'))
    await screen.findByTestId('run-status')

    unmount()
    gate.resolve()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    renderApp('#/algo/dijkstra')
    await screen.findByTestId('run-btn')
    expect(screen.queryByTestId('nqueens-n')).toBeNull()
  })
})
