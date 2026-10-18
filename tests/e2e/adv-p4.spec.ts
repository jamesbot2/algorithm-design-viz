/** 高阶算法 — P3 template-library preferences + P4 flows. Real mouse/keyboard, full HTTP app, retries 0. */
import { test, expect, type Page } from '@playwright/test'
import { open } from './adv-helpers'

test.describe.configure({ retries: 0 })

const lib = '#/advanced/templates'
const count = async (page: Page) => (await page.getByTestId('tpl-count').textContent())!.trim()
const visibleCards = (page: Page) => page.locator('[data-testid^="tpl-item-"]')

test.describe('ADV-24 template library: favorites, recent, filters (local only)', () => {
  test('filters by category / language / validation status narrow the real card list; empty result is explained', async ({ page }) => {
    await open(page, lib)
    await expect(visibleCards(page).first()).toBeVisible()
    const total = await visibleCards(page).count()
    expect(total).toBeGreaterThan(20)
    expect(await count(page)).toBe(`${total} / ${total}`)
    await page.getByTestId('filter-category').selectOption('STL')
    const stl = await visibleCards(page).count()
    expect(stl).toBeGreaterThanOrEqual(10)
    expect(stl).toBeLessThan(total)
    for (const t of await visibleCards(page).allTextContents()) expect(t).toContain('STL')
    expect(await count(page)).toBe(`${stl} / ${total}`)
    await page.getByTestId('filter-category').selectOption('')
    await page.getByTestId('filter-language').selectOption('java')
    const java = await visibleCards(page).count()
    expect(java).toBeGreaterThan(0)
    expect(java).toBeLessThan(total) // C++-only STL labs are excluded
    for (const t of await visibleCards(page).allTextContents()) expect(t).toContain('教学版六语言')
    await page.getByTestId('filter-language').selectOption('')
    await page.getByTestId('filter-status').selectOption('failed')
    await expect(page.getByTestId('tpl-empty')).toBeVisible()
    await page.getByTestId('filter-status').selectOption('verified')
    expect(await visibleCards(page).count()).toBe(total) // every shipped template is verified against the real toolchain
    for (const t of await visibleCards(page).allTextContents()) expect(t).toContain('已验证')
  })

  test('favorites persist across reload, filter to exactly the starred ones, and never leave the browser', async ({ page }) => {
    const external: string[] = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url())
    })
    await open(page, lib)
    await page.getByTestId('fav-dsu').click()
    await page.getByTestId('fav-stl-deque').click()
    await expect(page.getByTestId('fav-dsu')).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByTestId('fav-dsu')).toHaveAttribute('aria-pressed', 'true')
    await page.getByTestId('filter-fav').check()
    await expect(visibleCards(page)).toHaveCount(2)
    await expect(page.getByTestId('tpl-item-dsu')).toBeVisible()
    await expect(page.getByTestId('tpl-item-stl-deque')).toBeVisible()
    await page.getByTestId('fav-dsu').click()
    await expect(visibleCards(page)).toHaveCount(1)
    expect(external).toEqual([])
  })

  test('recently viewed: empty at first, then lists the template just opened (most recent first)', async ({ page }) => {
    await open(page, lib)
    await expect(page.getByTestId('tpl-recent')).toHaveCount(0)
    await page.getByTestId('tpl-fenwick').click()
    await expect(page.getByTestId('adv-template')).toBeVisible()
    await page.goBack()
    await page.getByTestId('tpl-dsu').click()
    await expect(page.getByTestId('adv-template')).toBeVisible()
    await page.goBack()
    const rec = await page.locator('[data-testid^="recent-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
    expect(rec).toEqual(['recent-dsu', 'recent-fenwick'])
  })
})
