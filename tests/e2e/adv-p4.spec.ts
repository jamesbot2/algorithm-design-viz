/** 高阶算法 — P3 template-library preferences + P4 flows. Real mouse/keyboard, full HTTP app, retries 0. */
import { test, expect, type Page } from '@playwright/test'
import { open, sceneAudit } from './adv-helpers'

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

const FW_FINAL_A = [3, 0, 5, 4, 0, 2, -1, 0] // add 0 3; add 2 5; add 5 2; add 6 -1; add 3 4 (default ops of the fenwick demo)
const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 1024, height: 600 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]
test.describe('ADV-25 representative flow at five viewports (real values, real clicks)', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.width}x${vp.height}: enter → search → explain → demo → run → step → languages → pause → resize → template/contest → copy/export → back to demo`, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await open(page, '#/', vp)
      if (vp.width <= 960) await page.getByTestId('menu-btn').click()
      await page.getByTestId('app-sidebar').getByRole('link', { name: '高阶算法', exact: true }).click()
      await expect(page.getByTestId('adv-home')).toBeVisible()
      await page.getByTestId('adv-search').fill('BIT')
      await page.getByTestId('topic-fenwick').click()
      await expect(page.getByTestId('adv-content')).toBeVisible()
      await expect(page.getByTestId('sec-complexity')).toBeVisible()
      await page.getByTestId('tab-demo').click()
      await expect(page.getByTestId('adv-demo')).toBeVisible()
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
      await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
      // step through a few frames with the real button, then jump to the end and read the painted array
      for (let i = 1; i <= 3; i++) {
        await page.getByTestId('next-step-btn').click()
        await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', String(i))
      }
      await page.getByRole('slider', { name: '步骤进度' }).focus()
      await page.keyboard.press('End')
      await expect(page.getByTestId('fw-node').first()).toBeVisible()
      const cellsNow = await page.locator('[data-testid="fw-cell"]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))))
      expect(cellsNow).toEqual(FW_FINAL_A)
      // languages: switching must not solve again, and the selected language is reflected
      const narrowLayout = !(await page.getByTestId('code-lang-switch').isVisible())
      if (narrowLayout) await page.getByTestId('workbench-tab-code').click() // single-pane layout: real tab press
      for (const l of ['python', 'cpp', 'typescript']) {
        const tab = page.getByTestId(l === 'typescript' ? 'tab-ts' : `tab-lang-${l}`)
        await tab.click()
        await expect(tab).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
      }
      if (narrowLayout) await page.getByTestId('workbench-tab-demo').click()
      // play then pause
      await page.getByTestId('reset-playback-btn').click()
      await page.getByTestId('play-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '1')
      await page.getByTestId('play-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
      // resize to a SMALLER viewport: still no extra solve, scene still painted
      await page.setViewportSize({ width: Math.min(vp.width, 360), height: Math.min(vp.height, 640) })
      await expect(page.getByTestId('adv-scene')).toBeVisible()
      await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', '1')
      await page.setViewportSize(vp)
      // back to the explanation, then the template page: contest/full, copy, export
      await page.goBack()
      await expect(page.getByTestId('adv-content')).toBeVisible()
      await page.getByTestId('tab-template').click()
      await expect(page.getByTestId('adv-template')).toBeVisible()
      await page.getByTestId('variant-contest').click()
      await page.getByTestId('form-full').click()
      await expect(page.getByTestId('tpl-shown')).toHaveAttribute('data-form', 'full')
      await page.getByTestId('tpl-copy').click()
      await expect(page.getByTestId('tpl-msg')).toHaveText('已复制')
      const clip = await page.evaluate(() => navigator.clipboard.readText())
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('tpl-export').click()])
      expect(dl.suggestedFilename()).toBe('fenwick_contest_full.cpp')
      const fs = await import('node:fs')
      const saved = fs.readFileSync((await dl.path())!, 'utf8')
      expect(saved).toBe(clip)
      expect(saved).toContain('int main')
      await page.getByTestId('back-to-demo').click()
      await expect(page.getByTestId('adv-demo')).toBeVisible()
    })
  }
})

test.describe('ADV-26 every template page has a complete header and its pieces', () => {
  test('all templates in the library: eight non-empty header fields, complexity, sample, counterexample, source', async ({ page }) => {
    await open(page, lib)
    await expect(visibleCards(page).first()).toBeVisible()
    const ids = (await visibleCards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('tpl-item-', ''))))
    expect(ids.length).toBeGreaterThanOrEqual(23)
    for (const id of ids) {
      await page.goto(`#/advanced/templates/${id}`)
      const dd = page.locator('[data-testid="tpl-header"] dd')
      await expect(dd, id).toHaveCount(8)
      const texts = await dd.allTextContents()
      expect(texts.every((t) => t.trim().length > 0), `${id}: ${JSON.stringify(texts)}`).toBe(true)
      await expect(page.getByTestId('tpl-header'), id).toContainText('O(')
      await expect(page.getByTestId('tpl-counter'), id).toBeVisible()
      await expect(page.getByTestId('tpl-source'), id).toBeVisible()
    }
  })
})

/**
 * V31-style measurement on the ADVANCED demos at 375x812. NOTE: V31's "main array vs companion band" budget belongs to the array-scene
 * algorithms (merge sort etc., still covered by v31-mobile-budget.spec.ts). The advanced module paints its own scene (adv-scene), so
 * here we measure the analogous quantities — scene height, painted cell size, in-box painting, page overflow — and record them.
 */
test.describe('ADV-27 advanced demos at 375x812: measured budget', () => {
  test.use({ viewport: { width: 375, height: 812 } })
  const rows: Record<string, unknown>[] = []
  for (const [id, section, cellTid] of [
    ['fenwick', 'algorithms', 'fw-cell'],
    ['dsu', 'algorithms', 'dsu-node'],
    ['stl-vector', 'stl', 'fam-cell'],
    ['mono-stack', 'algorithms', 'fam-cell'],
    ['stl-set-map', 'stl', 'fam-cell'],
  ] as const) {
    test(`${id}: scene is tall enough, every painted piece inside the scene box, no page-level horizontal overflow`, async ({ page }) => {
      await open(page, `#/advanced/${section}/${id}?view=demo`, { width: 375, height: 812 })
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
      await page.getByRole('slider', { name: '步骤进度' }).focus()
      await page.keyboard.press('End')
      const scene = page.getByTestId('adv-scene')
      await expect(scene).toBeVisible()
      const sb = (await scene.boundingBox())!
      const pieces = page.getByTestId(cellTid)
      const m = await pieces.evaluateAll((els) => {
        const w = els.map((e) => e.getBoundingClientRect())
        return { n: w.length, minW: Math.min(...w.map((r) => r.width)), minH: Math.min(...w.map((r) => r.height)) }
      })
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      const rec = { id, sceneW: Math.round(sb.width), sceneH: Math.round(sb.height), sceneShareOfViewportH: +(sb.height / 812).toFixed(2), pieces: m.n, minPieceW: Math.round(m.minW), minPieceH: Math.round(m.minH), pageOverflowX: over }
      rows.push(rec)
      test.info().annotations.push({ type: 'measure', description: JSON.stringify(rec) })
      await test.info().attach(`measure-${id}.json`, { body: JSON.stringify(rec), contentType: 'application/json' })
      await sceneAudit(page, cellTid, 1)
      expect(sb.width).toBeLessThanOrEqual(375)
      expect(sb.height, JSON.stringify(rec)).toBeGreaterThanOrEqual(180)
      expect(m.minW, JSON.stringify(rec)).toBeGreaterThanOrEqual(12)
      expect(over, JSON.stringify(rec)).toBeLessThanOrEqual(0)
    })
  }
})
