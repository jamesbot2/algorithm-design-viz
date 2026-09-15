import { test, expect } from '@playwright/test'

test.describe('V7 state regressions', () => {
  test('R2 dijkstra illegal n blocks run and keeps raw text', async ({ page }) => {
    await page.goto('#/algo/dijkstra')
    await expect(page.getByTestId('graph-input')).toBeVisible()
    const n = page.getByTestId('graph-n')
    await n.fill('abc')
    await expect(page.getByTestId('graph-input')).toHaveAttribute('data-can-run', '0')
    await expect(page.getByTestId('graph-n-error')).toBeVisible()
    await expect(n).toHaveValue('abc')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('graph-valid-ok')).toHaveCount(0)
  })

  test('R3 bubble replay seeks to start without re-run status', async ({ page }) => {
    await page.goto('#/algo/bubbleSort')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('playback-transport')).toBeVisible({ timeout: 20_000 })
    const slider = page.getByRole('slider', { name: /步骤进度/ })
    const max = await slider.getAttribute('max')
    await slider.fill(max ?? '0')
    const play = page.getByTestId('play-btn')
    await expect(play).toContainText(/重新播放/)
    await play.click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '0')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
  })

  test('R4 workbench keeps layout attribute while resizing container', async ({ page }) => {
    await page.goto('#/algo/bubbleSort')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 20_000 })
    const wb = page.getByTestId('workbench-layout')
    await page.setViewportSize({ width: 1280, height: 800 })
    // collapse sidebar to change container
    await page.getByTestId('desktop-collapse-btn').click()
    await page.setViewportSize({ width: 500, height: 800 })
    await expect(wb).toHaveAttribute('data-layout', 'tabs', { timeout: 10_000 })
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(wb).toHaveAttribute('data-layout', 'split', { timeout: 10_000 })
    // Visualizer still present (not remount-wiped to preview-only necessarily)
    await expect(page.getByTestId('visualizer')).toBeVisible()
  })

  test('R6 mobile open then desktop releases scroll lock', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 })
    await page.goto('#/')
    await page.getByTestId('menu-btn').click()
    await expect(page.locator('[data-mobile-modal="1"]')).toHaveCount(1)
    const overflowOpen = await page.evaluate(() => document.body.style.overflow)
    expect(overflowOpen).toBe('hidden')
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('[data-mobile-modal="1"]')).toHaveCount(0)
    const overflowAfter = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfter).not.toBe('hidden')
  })
})
