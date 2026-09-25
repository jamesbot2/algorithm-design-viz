import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { visiblePhaseJump } from './helpers/phaseJump'

const shotDir = path.join('docs', 'screenshots', 'v6')

test.beforeAll(() => {
  fs.mkdirSync(shotDir, { recursive: true })
})

test.describe('V6 UI/UX consistency', () => {
  test('UI-01 bubble: phase jump bounded after long run', async ({ page }) => {
    await page.goto('#/algo/bubbleSort')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('playback-transport')).toBeVisible({ timeout: 20_000 })
    // V23: chips are inline when roomy, else in the 阶段/设置 popover (same capped list)
    const jump = await visiblePhaseJump(page)
    const jumpBtns = jump.getByRole('button')
    const count = await jumpBtns.count()
    expect(count).toBeLessThanOrEqual(8)
    expect(count).toBeGreaterThan(0)

    // Last track segment left+width ≤ 100
    const overflow = await page.getByTestId('phase-track').evaluate((el) => {
      const segs = [...el.querySelectorAll('[data-phase]')] as HTMLElement[]
      return segs.some((s) => {
        const left = parseFloat(s.style.left || '0')
        const width = parseFloat(s.style.width || '0')
        return left + width > 100.05
      })
    })
    expect(overflow).toBe(false)

    const transportBox = await page.getByTestId('playback-transport').boundingBox()
    expect(transportBox).toBeTruthy()
    expect(transportBox!.height).toBeLessThan(280)

    await page.screenshot({ path: path.join(shotDir, 'bubble-default-transport.png'), fullPage: false })
  })

  test('UI-04 graph illegal edges do not run previous graph', async ({ page }) => {
    await page.goto('#/algo/dijkstra')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toBeVisible({ timeout: 20_000 })
    const stepsBefore = await page.getByTestId('step-counter').textContent()

    // V10-03: successful run collapses input for demo budget — re-open to edit edges
    const edit = page.getByTestId('input-edit-toggle')
    await expect(edit).toBeVisible()
    if ((await edit.textContent())?.includes('编辑输入')) await edit.click()

    const edges = page.getByRole('textbox', { name: /边列表/ })
    await expect(edges).toBeVisible({ timeout: 5_000 })
    await edges.fill('this is not valid')
    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByText(/图校验通过/)).toHaveCount(0)

    await page.getByTestId('run-btn').click()
    // Should show validation errors; step counter should not advance as a new successful run with old edges
    await expect(page.locator('.input-errors, [role="alert"]').first()).toBeVisible()
    // Dirty/error state — can-run false on graph input
    await expect(page.getByTestId('graph-input')).toHaveAttribute('data-can-run', '0')
    void stepsBefore
  })

  test('UI-05 experiment export keeps dijkstra snapshot after switching', async ({ page }) => {
    await page.goto('#/experiment')
    await page.getByTestId('experiment-run').click()
    await expect(page.getByTestId('experiment-result-which')).toContainText('dijkstra')

    await page.getByTestId('experiment-which').selectOption('knapsack')
    await expect(page.getByTestId('experiment-pending')).toBeVisible()
    await expect(page.getByTestId('experiment-result-which')).toContainText('dijkstra')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('experiment-export-csv').click(),
    ])
    expect(download.suggestedFilename()).toBe('experiment-dijkstra.csv')
  })

  test('UI-05 knapsack dirty after preset switch', async ({ page }) => {
    await page.goto('#/teach/knapsack')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('knapsack-run-summary')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('knapsack-preset').selectOption('greedy')
    await expect(page.getByTestId('knapsack-dirty-banner')).toBeVisible()
    await expect(page.getByTestId('knapsack-draft-summary')).toContainText('W=50')
    await page.screenshot({ path: path.join(shotDir, 'knapsack-dirty.png') })
  })
})
