import { expect, type Page } from '@playwright/test'
import { ensureInputEditing } from './ensureInputEditing'

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

/** Open data sheet without force:true or secret viewport swap (V17-04). */
export async function openDataSheet(page: Page) {
  const toggle = page.getByTestId('inspector-sheet-toggle')
  await expect(toggle).toBeVisible({ timeout: 10_000 })
  const hidden = await toggle.getAttribute('hidden')
  expect(hidden, 'inspector toggle must be visible without viewport swap').toBeNull()
  await toggle.click()
  await expect(page.getByTestId('inspector-sheet')).toBeVisible({ timeout: 8_000 })
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
