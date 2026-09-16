import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('V5 R1 tab switch + R4 swap settle', () => {
  test('R1 binarySearch tab switch uses that doc anchors', async ({ page }) => {
    await page.goto('#/algo/binarySearch')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('code-browser')).toBeVisible()

    // Step to mid/equal-ish
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole('button', { name: /下一步|›|Next/i })
      if (await next.count()) await next.first().click()
    }

    const tsLine = await page.getByTestId('code-mirror-wrap').getAttribute('data-exec-line')
    await page.getByTestId('tab-pseudo').click()
    await expect(page.getByTestId('code-browser')).toHaveAttribute('data-tab', 'pseudo')
    const pseudoLine = await page.getByTestId('pseudo-pre').getAttribute('data-exec-line')
    // Different documents → different line numbers for same anchor
    expect(tsLine).toBeTruthy()
    expect(pseudoLine).toBeTruthy()
    expect(tsLine).not.toBe(pseudoLine)

    // Active doc id differs
    const docId = await page.getByTestId('code-browser').getAttribute('data-active-doc')
    expect(docId).toContain('pseudo')
  })

  test('R4 quickSort swap settles to transform none', async ({ page }) => {
    await page.goto('#/algo/quickSort')
    // V10-01: open folded input before fill
    const edit = page.getByTestId('input-edit-toggle')
    await expect(edit).toBeVisible()
    if ((await edit.textContent())?.includes('编辑输入')) await edit.click()
    const arrayInput = page.locator('label.field-array input, [data-testid="array-input"]').first()
    await expect(arrayInput).toBeVisible({ timeout: 5_000 })
    await arrayInput.fill('2, 1')
    await page.getByTestId('run-btn').click()

    // Advance until a swap step
    for (let i = 0; i < 12; i++) {
      const msg = await page.locator('.viz-banner, .step-message, [data-testid="step-message"]').first().textContent().catch(() => '')
      if (msg && /交换|就位/.test(msg)) break
      const next = page.getByRole('button', { name: /下一步|›|Next/i })
      if (await next.count()) await next.first().click()
      await page.waitForTimeout(50)
    }

    // Wait for FLIP settle
    await page.waitForTimeout(400)
    const layers = page.locator('[data-flip-layer]')
    const n = await layers.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const t = await layers.nth(i).evaluate((el) => {
        const s = (el as HTMLElement).style.transform
        const c = getComputedStyle(el).transform
        return { s, c }
      })
      const ok =
        !t.s ||
        t.s === 'none' ||
        t.s === '' ||
        t.s === 'translate(0px, 0px)' ||
        t.s === 'translateX(0px)' ||
        t.c === 'none' ||
        t.c === 'matrix(1, 0, 0, 1, 0, 0)'
      expect(ok, JSON.stringify(t)).toBeTruthy()
      expect(t.s).not.toMatch(/28px/)
    }

    // Element centers ≈ slot centers
    const drift = await page.evaluate(() => {
      const slots = [...document.querySelectorAll('.bar-col')] as HTMLElement[]
      let max = 0
      for (const slot of slots) {
        const layer = slot.querySelector('[data-flip-layer]') as HTMLElement | null
        if (!layer) continue
        const sr = slot.getBoundingClientRect()
        const lr = layer.getBoundingClientRect()
        max = Math.max(max, Math.abs(sr.left + sr.width / 2 - (lr.left + lr.width / 2)))
      }
      return max
    })
    expect(drift).toBeLessThanOrEqual(1.5)

    fs.mkdirSync('docs/traces/v5', { recursive: true })
    fs.writeFileSync(
      path.join('docs/traces/v5', 'r4-swap-settle.json'),
      JSON.stringify({ drift, at: new Date().toISOString() }, null, 2),
    )
  })
})
