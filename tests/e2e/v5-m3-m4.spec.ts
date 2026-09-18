import { test, expect } from '@playwright/test'
import { ensureInputEditing } from './helpers/ensureInputEditing'

test.describe('V5 M3/M4 workbench + expand e2e', () => {
  test('binarySearch TS↔pseudo mid lines differ by document', async ({ page }) => {
    await page.goto('#/algo/binarySearch')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('code-browser')).toBeVisible()

    for (let i = 0; i < 4; i++) {
      const next = page.getByRole('button', { name: /下一步/ })
      if (await next.count()) await next.first().click()
    }

    const tsLine = await page.getByTestId('code-mirror-wrap').getAttribute('data-exec-line')
    await page.getByTestId('tab-pseudo').click()
    const pseudoLine = await page.getByTestId('pseudo-pre').getAttribute('data-exec-line')
    expect(tsLine).toBeTruthy()
    expect(pseudoLine).toBeTruthy()
    expect(tsLine).not.toBe(pseudoLine)

    // Transport lives in workbench slot spanning panels
    await expect(page.getByTestId('workbench-transport')).toBeVisible()
    await expect(page.getByTestId('playback-transport')).toBeVisible()
    await expect(page.getByTestId('play-btn')).toBeVisible()
  })

  test('LCS write primary anchor present after run', async ({ page }) => {
    await page.goto('#/algo/lcs')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('code-browser')).toBeVisible({ timeout: 20_000 })

    let foundWrite = false
    for (let i = 0; i < 80; i++) {
      const body = await page.locator('body').innerText()
      if (/takeDiagonal|取对角|对角写入|匹配 '/.test(body)) {
        foundWrite = true
        break
      }
      const next = page.getByTestId('playback-transport').getByRole('button', { name: /下一步/ })
      if (await next.isEnabled()) await next.click()
      else break
      await page.waitForTimeout(20)
    }
    expect(foundWrite).toBeTruthy()
    const meta = await page.getByTestId('code-browser').innerText()
    // Primary write should surface takeDiagonal in status or banner eventually
    expect(/takeDiagonal|对角|匹配/.test(meta + (await page.getByTestId('viz-banner').innerText()))).toBeTruthy()
  })

  test('quickSort play advances steps', async ({ page }) => {
    await page.goto('#/algo/quickSort')
    await ensureInputEditing(page)
    const arrayInput = page.locator('[data-testid="array-input"], label.field-array input').first()
    await expect(arrayInput).toBeVisible({ timeout: 5_000 })
    await arrayInput.fill('3,1,2')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('play-btn')).toBeVisible()
    const before = await page.getByTestId('step-counter').textContent()
    await page.getByTestId('play-btn').click()
    await page.waitForTimeout(900)
    await page.getByTestId('play-btn').click() // pause
    const after = await page.getByTestId('step-counter').textContent()
    expect(after).not.toBe(before)
  })

  test('cancel enabled while heavy nQueens running', async ({ page }) => {
    await page.goto('#/algo/nQueens')
    // V16-05: nQueens may start collapsed on short viewports — expand before fill
    await ensureInputEditing(page)
    const nField = page.locator('label:has-text("n") input, [data-testid="nqueens-n"]').first()
    await expect(nField).toBeVisible({ timeout: 5_000 })
    await nField.fill('8')
    const cancel = page.getByTestId('cancel-btn')
    await expect(cancel).toBeDisabled()
    await page.getByTestId('run-btn').click()
    // While running, cancel should enable
    await expect(cancel).toBeEnabled({ timeout: 5_000 })
  })

  test('theme switch readability smoke', async ({ page }) => {
    await page.goto('#/algo/binarySearch')
    const theme = page.locator('select[aria-label="主题"]').first()
    await expect(theme).toBeVisible()
    await theme.selectOption('lab-light')
    await expect(page.locator('html')).toHaveAttribute('data-lab-theme', 'lab-light')
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    // light: not near-black
    expect(bg).not.toMatch(/rgb\(15,\s*17,\s*23\)/)
    const color = await page.evaluate(() => getComputedStyle(document.body).color)
    // text should be dark-ish on light
    const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    expect(m).toBeTruthy()
    const lum = (Number(m![1]) + Number(m![2]) + Number(m![3])) / 3
    expect(lum).toBeLessThan(80)

    await theme.selectOption('lab-dark')
    await expect(page.locator('html')).toHaveAttribute('data-lab-theme', 'lab-dark')
    const colorDark = await page.evaluate(() => getComputedStyle(document.body).color)
    const md = colorDark.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    const lumD = (Number(md![1]) + Number(md![2]) + Number(md![3])) / 3
    expect(lumD).toBeGreaterThan(140)
  })
})
