import { expect, type Page } from '@playwright/test'
import { ensureInputEditing } from './ensureInputEditing'
import { openCurrentData } from './currentData'

/**
 * V16-02 / V17-04: Wait for a submitted run to be ready — not merely play-btn visible.
 * Checks: data-preview=0, step count / counter present, THIS run id/revision when known.
 */
export type RunReadyOpts = {
  timeout?: number
  /** Require at least this many steps (length). Default 2 (preview alone is 1). */
  minSteps?: number
  /** Bind readiness to this run id (must match visualizer data-run-id). */
  runId?: string | number
  /** Capture run id at click time; wait until data-run-id equals this (stringified). */
  expectRunId?: string | number
}

export async function waitForRunReady(page: Page, opts: RunReadyOpts = {}) {
  const timeout = opts.timeout ?? 30_000
  const minSteps = opts.minSteps ?? 2
  const expected =
    opts.expectRunId !== undefined
      ? String(opts.expectRunId)
      : opts.runId !== undefined
        ? String(opts.runId)
        : null
  const viz = page.getByTestId('visualizer')
  await expect(viz).toBeVisible({ timeout })
  await expect(viz).toHaveAttribute('data-preview', '0', { timeout })
  if (expected !== null) {
    await expect(viz).toHaveAttribute('data-run-id', expected, { timeout })
  }
  await expect(page.getByTestId('play-btn')).toBeVisible({ timeout })
  await expect(page.getByTestId('step-counter')).toBeVisible({ timeout })

  await page.waitForFunction(
    ({ minSteps: ms, expectedRunId }) => {
      const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
      if (!el) return false
      if (el.getAttribute('data-preview') !== '0') return false
      if (expectedRunId !== null) {
        const rid = el.getAttribute('data-run-id')
        if (rid !== expectedRunId) return false
      }
      const idxAttr = el.getAttribute('data-step-index')
      if (idxAttr === null || idxAttr === '') return false
      const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
      // "i / n" 1-based
      const m = counter.match(/(\d+)\s*\/\s*(\d+)/)
      if (!m) return false
      const total = Number(m[2])
      return total >= ms
    },
    { minSteps, expectedRunId: expected },
    { timeout },
  )

  const snap = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
    const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
    return {
      preview: el?.getAttribute('data-preview'),
      stepIndex: el?.getAttribute('data-step-index'),
      runId: el?.getAttribute('data-run-id'),
      counter,
      playing: el?.getAttribute('data-playing'),
    }
  })
  return snap
}

/**
 * Open current data without force:true or secret viewport swap (V17-04).
 * V23: data is a workbench region / 「数据」 tab (the body-portal sheet was removed);
 * the entry must be reachable at the current viewport.
 */
export async function openDataSheet(page: Page) {
  await openCurrentData(page)
  return true
}

/** Fill classic Dijkstra n=3 case and run to readiness (bound to THIS run). */
export async function prepareDijkstraN3Ready(page: Page) {
  await page.goto('#/algo/dijkstra')
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await ensureInputEditing(page)
  await page.getByTestId('graph-n').fill('3')
  await page.getByTestId('graph-start').fill('0')
  await page.getByTestId('graph-edges').fill('0 1 10\n0 2 1\n2 1 1')
  const beforeRunId = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await page.getByTestId('run-btn').click()
  // Wait until run id advances (or appears) then bind readiness to it
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
      if (!el || el.getAttribute('data-preview') !== '0') return false
      const rid = el.getAttribute('data-run-id')
      if (!rid || rid === 'preview') return false
      return prev == null || prev === 'preview' || rid !== prev
    },
    beforeRunId,
    { timeout: 30_000 },
  )
  const runId = await page.getByTestId('visualizer').getAttribute('data-run-id')
  return waitForRunReady(page, { expectRunId: runId ?? undefined, minSteps: 2 })
}

/**
 * V34: explicit, bounded, observable layout-ready contract for the stage (replaces fixed sleeps).
 * Ready = no FLIP layer in flight, no bar re-fit pending (data-refit), and the primary array's slot /
 * bar / card geometry identical over `frames` consecutive animation frames. Fails loudly (with the
 * last two geometry snapshots) after `timeout` ms — never resolves on a timer.
 */
export async function waitForStageLayoutStable(page: Page, opts: { frames?: number; timeout?: number; array?: string } = {}) {
  const frames = opts.frames ?? 3
  const timeout = opts.timeout ?? 5_000
  const array = opts.array ?? 'a'
  const res = await page.evaluate(
    ({ frames, timeout, array }) =>
      new Promise<{ ok: boolean; frames: number; ms: number; last: string; prev: string }>((resolve) => {
        const t0 = performance.now()
        const snap = () => {
          const stage = document.querySelector('[data-testid="viz-canvas"]')
          const view = stage
            ? [...stage.querySelectorAll(`.array-view[data-array="${array}"]`)].find((v) => !v.closest('.array-buffers'))
            : undefined
          const busy = !!stage?.querySelector('[data-run-flip="1"], .bars-wrap[data-refit="1"]')
          const r = (el: Element | null | undefined) => {
            if (!el) return '-'
            const b = el.getBoundingClientRect()
            return `${b.top.toFixed(2)},${b.height.toFixed(2)}`
          }
          const parts = [r(stage), r(view)]
          if (view) for (const s of view.querySelectorAll('[data-slot-index]')) parts.push(r(s), r(s.querySelector('.bar, .bar-zero-marker')))
          return { busy, key: parts.join('|') }
        }
        let prev = ''
        let same = 0
        let n = 0
        const tick = () => {
          n++
          const s = snap()
          same = !s.busy && s.key === prev ? same + 1 : 0
          const last = prev
          prev = s.key
          const ms = performance.now() - t0
          if (same >= frames - 1) return resolve({ ok: true, frames: n, ms, last: s.key, prev: last })
          if (ms > timeout) return resolve({ ok: false, frames: n, ms, last: s.key, prev: last })
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    { frames, timeout, array },
  )
  expect(res.ok, `stage layout not stable after ${Math.round(res.ms)}ms / ${res.frames} frames: ${res.prev} -> ${res.last}`).toBe(true)
  return res
}
