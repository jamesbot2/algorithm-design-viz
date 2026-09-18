import { expect, type Page } from '@playwright/test'

/**
 * V16-02: Wait for a submitted run to be ready — not merely play-btn visible.
 * Checks: data-preview=0, step count / counter present, optional runId stable.
 */
export type RunReadyOpts = {
  timeout?: number
  /** Require at least this many steps (length). Default 2 (preview alone is 1). */
  minSteps?: number
}

export async function waitForRunReady(page: Page, opts: RunReadyOpts = {}) {
  const timeout = opts.timeout ?? 30_000
  const minSteps = opts.minSteps ?? 2
  const viz = page.getByTestId('visualizer')
  await expect(viz).toBeVisible({ timeout })
  await expect(viz).toHaveAttribute('data-preview', '0', { timeout })
  await expect(page.getByTestId('play-btn')).toBeVisible({ timeout })
  await expect(page.getByTestId('step-counter')).toBeVisible({ timeout })

  await page.waitForFunction(
    ({ minSteps: ms }) => {
      const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
      if (!el) return false
      if (el.getAttribute('data-preview') !== '0') return false
      const idxAttr = el.getAttribute('data-step-index')
      if (idxAttr === null || idxAttr === '') return false
      const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
      // "i / n" 1-based
      const m = counter.match(/(\d+)\s*\/\s*(\d+)/)
      if (!m) return false
      const total = Number(m[2])
      return total >= ms
    },
    { minSteps },
    { timeout },
  )

  const snap = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
    const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
    return {
      preview: el?.getAttribute('data-preview'),
      stepIndex: el?.getAttribute('data-step-index'),
      counter,
      playing: el?.getAttribute('data-playing'),
    }
  })
  return snap
}

/** Fill classic Dijkstra n=3 case and run to readiness. */
export async function prepareDijkstraN3Ready(page: Page) {
  await page.goto('#/algo/dijkstra')
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  const edit = page.getByTestId('input-edit-toggle')
  if (await edit.count()) {
    const t = await edit.textContent()
    if (t?.includes('编辑输入')) await edit.click()
  }
  await page.getByTestId('graph-n').fill('3')
  await page.getByTestId('graph-start').fill('0')
  await page.getByTestId('graph-edges').fill('0 1 10\n0 2 1\n2 1 1')
  await page.getByTestId('run-btn').click()
  return waitForRunReady(page)
}
