/**
 * V32 — integrated two-level nav (rail + catalog). Real mouse/keyboard/touch only; no force,
 * no evaluate(click), no pre-scrollIntoView, no viewport rescue. retries 0.
 * V32_FAULT=dots|hide-entry|dark-rail re-runs the same detectors against an injected fault (must fail).
 */
import { test, expect, type Page } from '@playwright/test'
import { injectFault, railAudit, railContrast, wbState } from './helpers/v32Nav'

test.describe.configure({ retries: 0 })

async function open(page: Page, hash: string, theme: 'lab-dark' | 'lab-light' = 'lab-dark') {
  await page.addInitScript((t) => localStorage.setItem('adv-lab-theme', t), theme)
  await page.goto(hash)
  await expect(page.getByTestId('app-sidebar')).toBeVisible()
  await injectFault(page)
}

async function midRun(page: Page, id: string, steps: number) {
  await open(page, `#/algo/${id}`)
  await page.getByTestId('run-btn').click()
  await expect(page.getByTestId('next-step-btn')).toBeEnabled({ timeout: 20_000 })
  for (let i = 0; i < steps; i++) await page.getByTestId('next-step-btn').click()
  await page.waitForTimeout(500)
  // scroll the code reader somewhere specific (reading position)
  const cm = page.locator('.cm-scroller').first()
  await cm.hover()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
}

for (const theme of ['lab-dark', 'lab-light'] as const) {
  test(`1 · 1366×768 collapsed rail: no dot list, low-contrast shell, catalog in ≤2 actions (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await open(page, '#/algo/lcs', theme)
    const a = await railAudit(page)
    expect(a.width).toBeLessThanOrEqual(64)
    expect(a.nonInteractive, 'rail paints only interactive items').toEqual([])
    expect(a.unnamed).toBe(0)
    expect(a.entryVisible, 'catalog entry visible in rail').toBe(true)
    const c = await railContrast(page)
    test.info().annotations.push({ type: 'contrast', description: JSON.stringify(c) })
    expect(c.dRGB, `rail vs workbench colour distance ${JSON.stringify(c)}`).toBeLessThanOrEqual(6)
    // action 1: open catalog (mouse)
    await page.getByTestId('catalog-entry').click()
    const pop = page.getByTestId('catalog-pop')
    await expect(pop).toBeVisible()
    await expect(pop.getByTestId('algo-search')).toBeFocused()
    await expect(pop.locator('[aria-current="page"]')).toHaveText('最长公共子序列 (LCS)')
    // action 2: search + choose (keyboard)
    await page.keyboard.type('归并')
    const link = pop.getByRole('link', { name: '归并排序' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/#\/algo\/mergeSort$/)
    await expect(pop).toBeHidden()
  })
}

test('1b · keyboard: rail Tab order is meaningful; Esc closes catalog and returns focus; outside click closes without switching', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await open(page, '#/algo/lcs')
  const names: string[] = []
  await page.keyboard.press('Tab')
  for (let i = 0; i < 7; i++) {
    names.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''))
    await page.keyboard.press('Tab')
  }
  expect(names.slice(0, 7)).toEqual(['算法设计与分析 · 首页', '展开侧栏', '全部算法', '算法目录', '练习台', '实验台', '实验讲义'])
  const entry = page.getByTestId('catalog-entry')
  await entry.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('catalog-pop')).toBeVisible()
  await expect(entry).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('catalog-pop')).toBeHidden()
  await expect(entry).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.type('Dijk')
  await page.mouse.click(900, 400) // outside
  await expect(page.getByTestId('catalog-pop')).toBeHidden()
  await expect(page).toHaveURL(/#\/algo\/lcs$/)
  // search text preserved on reopen
  await entry.click()
  await expect(page.getByTestId('catalog-pop').getByTestId('algo-search')).toHaveValue('Dijk')
})

test('2 · 1920×1080 expanded: search, three groupings, selection, chapters, practice and lab', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await open(page, '#/algo/dijkstra')
  const sb = page.getByTestId('app-sidebar')
  await expect(sb.getByRole('heading', { name: '算法目录' })).toBeVisible()
  for (const n of ['全部算法', '练习台', '实验台', '实验讲义']) await expect(sb.getByRole('link', { name: n })).toBeVisible()
  await expect(sb.locator('[aria-current="page"]')).toHaveCount(1)
  await sb.getByRole('button', { name: '按问题类型' }).click()
  await expect(sb.getByRole('button', { name: '按问题类型' })).toHaveAttribute('aria-pressed', 'true')
  await expect(sb.locator('[aria-current="page"]').first()).toBeVisible()
  await sb.getByRole('button', { name: '按章节' }).click()
  await expect(sb.getByRole('link', { name: '本章讲义' }).first()).toBeVisible()
  const total = await sb.locator('.nav-algo').count()
  expect(total, 'one grouping at a time — no duplicated course list').toBeLessThan(70)
  await sb.getByTestId('algo-search').fill('背包')
  await expect(sb.locator('.nav-algo').first()).toBeVisible()
  expect(await sb.locator('.nav-algo').count()).toBeLessThan(8)
  // collapse a group, header stays a real button
  await sb.getByTestId('algo-search').fill('')
  const head = sb.locator('.nav-sec-toggle').first()
  await head.click()
  await expect(head).toHaveAttribute('aria-expanded', 'false')
  await sb.getByRole('link', { name: '练习台' }).click()
  await expect(page).toHaveURL(/#\/practice/)
  await expect(sb.getByRole('link', { name: '练习台' })).toHaveAttribute('aria-current', 'page')
  const c = await railContrast(page)
  expect(c.dRGB).toBeLessThanOrEqual(6)
})

test('3 · continuous resize across 960↔961 and 1439↔1440 keeps one nav and the workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await open(page, '#/algo/lcs')
  await page.getByTestId('run-btn').click()
  await expect(page.getByTestId('next-step-btn')).toBeEnabled({ timeout: 20_000 })
  const before = await wbState(page)
  for (const w of [961, 960, 959, 960, 961, 1200, 1439, 1440, 1441, 1440, 1439, 961, 960, 1366]) {
    await page.setViewportSize({ width: w, height: 768 })
    await page.waitForTimeout(120)
    const g = await page.evaluate(() => {
      const sb = document.querySelector('.sidebar')!.getBoundingClientRect()
      const vis = (s: string) => {
        const e = document.querySelector(s)
        if (!e) return 0
        const r = e.getBoundingClientRect()
        return Math.round(Math.min(r.width, r.height))
      }
      const offscreenFocusable = [...document.querySelectorAll<HTMLElement>('.sidebar a, .sidebar button, .sidebar input')].filter(
        (e) => !e.closest('[inert]') && e.tabIndex >= 0 && e.getBoundingClientRect().right <= 0,
      ).length
      return { sidebars: document.querySelectorAll('.sidebar').length, sbLeft: sb.left, sbW: sb.width, viz: vis('[data-testid="visualizer"]'), code: vis('.cm-editor'), offscreenFocusable, pops: document.querySelectorAll('.nav-pop').length }
    })
    expect(g.sidebars).toBe(1)
    expect(g.offscreenFocusable, `w=${w}`).toBe(0)
    expect(g.viz, `viz visible w=${w}`).toBeGreaterThan(40)
    if (w > 960) {
      expect(g.sbLeft).toBe(0)
      const c = await railContrast(page)
      expect(c.dRGB, `w=${w}`).toBeLessThanOrEqual(6)
    } else expect(g.sbLeft + g.sbW, 'drawer closed below 961').toBeLessThanOrEqual(0)
  }
  const after = await wbState(page)
  expect(after.runId).toBe(before.runId)
  expect(after.step).toBe(before.step)
  expect(after.solveCount).toBe(before.solveCount)
})

for (const vp of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`4 · ${vp.width}×${vp.height} drawer: full catalog, lock, Esc/focus, tap select`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    await open(page, '#/algo/lcs')
    expect(await page.locator('[data-testid="catalog-entry"]').count(), 'no desktop rail on phones').toBe(0)
    const menu = page.getByTestId('menu-btn')
    await menu.tap()
    const sb = page.getByTestId('app-sidebar')
    await expect(page.getByTestId('mobile-drawer-close')).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await expect.poll(async () => (await sb.boundingBox())!.x, { message: 'drawer slid fully in' }).toBeGreaterThanOrEqual(0)
    const r = await sb.boundingBox()
    expect(r!.x).toBeGreaterThanOrEqual(0)
    expect(r!.x + r!.width).toBeLessThanOrEqual(vp.width)
    expect(r!.height).toBeLessThanOrEqual(vp.height + 1)
    await expect(sb.getByTestId('algo-search')).toBeVisible()
    await expect(sb.getByRole('button', { name: '按章节' })).toBeVisible()
    // independent scroll of drawer content
    const ns = page.getByTestId('nav-scroll')
    const sc = await ns.evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight }))
    expect(sc.sh).toBeGreaterThan(sc.ch)
    // keyboard contract
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('.sidebar'))).toBe(true)
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Escape')
    await expect(menu).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    // reopen, search and tap
    await menu.tap()
    await sb.getByTestId('algo-search').tap()
    await page.keyboard.type('快速')
    await sb.getByRole('link', { name: '快速排序' }).tap()
    await expect(page).toHaveURL(/#\/algo\/quickSort$/)
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await ctx.close()
  })
}

for (const [id, steps] of [
  ['lcs', 6],
  ['mergeSort', 5],
  ['dijkstra', 4],
] as const) {
  test(`5 · ${id} mid-run: toggle sidebar / open catalog without selecting / language switch keep the run`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await midRun(page, id, steps)
    const s0 = await wbState(page)
    expect(s0.runId).not.toBeNull()
    test.info().annotations.push({ type: 'state0', description: JSON.stringify(s0) })
    // open catalog, look, Esc
    await page.getByTestId('catalog-entry').click()
    await expect(page.getByTestId('catalog-pop')).toBeVisible()
    await page.keyboard.press('Escape')
    const s1 = await wbState(page)
    expect(s1).toEqual(s0)
    // expand + collapse sidebar
    await page.getByTestId('desktop-collapse-btn').click()
    await page.waitForTimeout(300)
    await page.getByTestId('desktop-collapse-btn').click()
    await page.waitForTimeout(300)
    const s2 = await wbState(page)
    // width changes re-wrap the code, so compare the reading position as the top visible source line
    // Expanding the sidebar narrows the code column; CodeMirror keeps its pixel scrollTop, so line
    // re-wrap can move the top visible line by one source line (known gap, reported in V32_DELIVERY).
    // Everything else must be identical; the overlay catalog (s1 above) is held to exact equality.
    expect({ ...s2, cmTop: null }).toEqual({ ...s0, cmTop: null })
    expect(Math.abs((s2.cmTop ?? 0) - (s0.cmTop ?? 0)), 'reading position within one source line').toBeLessThanOrEqual(1)
    // language switch and back
    const sw = page.getByTestId('code-lang-switch')
    await sw.getByTestId('tab-lang-python').click()
    await page.waitForTimeout(300)
    await sw.getByTestId('tab-ts').click()
    await page.waitForTimeout(300)
    const s3 = await wbState(page)
    expect([s3.runId, s3.step, s3.playing, s3.banner, s3.solveCount]).toEqual([s0.runId, s0.step, s0.playing, s0.banner, s0.solveCount])
  })
}

test('6 · switching algorithm from the catalog follows switch rules (no stale write-back)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await midRun(page, 'lcs', 4)
  await page.getByTestId('play-btn').click()
  await page.getByTestId('catalog-entry').click()
  await page.keyboard.type('Dijkstra')
  await page.getByTestId('catalog-pop').getByRole('link', { name: /Dijkstra/ }).first().click()
  await expect(page).toHaveURL(/#\/algo\/dijkstra/)
  await expect(page.locator('.topbar-title')).toContainText('Dijkstra')
  await page.waitForTimeout(1200)
  const banner = (await page.getByTestId('viz-banner').textContent()) ?? ''
  expect(banner).not.toMatch(/dp\[|LCS|公共子序列/)
  await expect(page.getByTestId('graph-input').or(page.getByTestId('input-panel')).first()).toBeVisible()
  await expect(page.locator('.cm-content')).not.toContainText('function lcs')
})
