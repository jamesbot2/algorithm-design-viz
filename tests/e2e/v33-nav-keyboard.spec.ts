/**
 * V33 — nav keyboard ownership, modal mobile drawer, responsive collapse default.
 * Real mouse / keyboard (page.keyboard / page.mouse / locator.click) on the full HTTP app.
 * No dispatchEvent, no force, no evaluate(click), no pre-scrollIntoView, no viewport rescue. retries 0.
 * page.evaluate is used for READ-ONLY probes (state snapshots, activeElement).
 */
import { test, expect, type Page } from '@playwright/test'
import { wbState } from './helpers/v32Nav'

test.describe.configure({ retries: 0 })

async function open(page: Page, hash: string) {
  await page.addInitScript(() => localStorage.setItem('adv-lab-theme', 'lab-dark'))
  await page.goto(hash)
  await expect(page.getByTestId('app-sidebar')).toBeAttached()
}

async function kb(page: Page) {
  return page.evaluate(() => {
    const viz = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
    return {
      runId: viz?.dataset.runId ?? null,
      idx: viz?.dataset.stepIndex ?? null,
      playing: viz?.dataset.playing ?? null,
      solveCount: (document.querySelector('.algo-page') as HTMLElement | null)?.dataset.solveCount ?? null,
      speed: (document.querySelector('[data-testid="speed-select"], select[aria-label*="速度"]') as HTMLSelectElement | null)?.value ?? null,
    }
  })
}

const active = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    return { tag: a?.tagName ?? null, text: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 40), inSidebar: !!a?.closest('#app-sidebar') }
  })

async function runAndStepOnce(page: Page) {
  await page.getByTestId('run-btn').click()
  await expect(page.getByTestId('next-step-btn')).toBeEnabled({ timeout: 20_000 })
  await page.getByTestId('next-step-btn').click()
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-playing', '0')
}

/** Tab (real key) until the focused element's text matches; bounded. */
async function tabTo(page: Page, re: RegExp, max = 80, key = 'Tab') {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key)
    const a = await active(page)
    if (re.test(a.text)) return i + 1
  }
  throw new Error(`never reached ${re} with ${key}`)
}

test.describe('V33-01 keyboard ownership', () => {
  test('1366 popover: arrows/Space on a focused link do not drive the player; Enter navigates; stage works after close', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await open(page, '#/algo/lcs')
    await runAndStepOnce(page)
    const before = await kb(page)
    test.info().annotations.push({ type: 'before', description: JSON.stringify(before) })
    await page.getByTestId('catalog-entry').click()
    const pop = page.getByTestId('catalog-pop')
    await expect(pop).toBeVisible()
    // search input owns arrows
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    expect(await kb(page)).toEqual(before)
    const presses = await tabTo(page, /^冒泡排序$/)
    test.info().annotations.push({ type: 'tabs-to-link', description: String(presses) })
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'Space', 'ArrowDown', 'ArrowUp']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(150)
      expect(await kb(page), `after ${k} on link`).toEqual(before)
    }
    await expect(page).toHaveURL(/#\/algo\/lcs$/)
    // Escape closes catalog; focus returns to rail entry; then stage shortcuts work again
    await page.keyboard.press('Escape')
    await expect(pop).toBeHidden()
    await page.getByTestId('visualizer').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '2')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-step-index', '1')
    const mid = await kb(page)
    // reopen, Tab to the link, Enter navigates
    await page.getByTestId('catalog-entry').click()
    await expect(pop).toBeVisible()
    await tabTo(page, /^冒泡排序$/)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/algo\/bubbleSort$/)
    await page.waitForTimeout(800)
    const after = await kb(page)
    test.info().annotations.push({ type: 'after-nav', description: JSON.stringify({ mid, after }) })
    expect(after.playing).toBe('0')
    expect(after.idx === null || after.idx === '0').toBe(true)
  })

  test('1920 expanded sidebar: arrows/Space/Enter-less keys on sidebar links and group tabs do not drive the player', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await open(page, '#/algo/lcs')
    await runAndStepOnce(page)
    const before = await kb(page)
    await page.getByTestId('app-sidebar').getByTestId('algo-search').click()
    await tabTo(page, /^冒泡排序$/)
    for (const k of ['ArrowRight', 'Space', 'ArrowLeft']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(150)
      expect(await kb(page), `after ${k}`).toEqual(before)
    }
    await expect(page).toHaveURL(/#\/algo\/lcs$/)
  })
})

async function drawerFocusables(page: Page) {
  return page.evaluate(() => {
    const sb = document.getElementById('app-sidebar')!
    return [...sb.querySelectorAll<HTMLElement>('a[href], button, input, select, [tabindex]')].filter(
      (e) => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.getClientRects().length > 0,
    ).length
  })
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test.describe(`V33-02 mobile drawer modal ${vp.width}x${vp.height}`, () => {
    test('dialog semantics, inert background, Tab/Shift+Tab cycles, search shrink, Esc restores focus+scroll', async ({ page }) => {
      await page.setViewportSize(vp)
      await open(page, '#/algo/lcs')
      const menu = page.getByTestId('menu-btn')
      await menu.click()
      const sb = page.getByTestId('app-sidebar')
      await expect(sb).toHaveAttribute('role', 'dialog')
      await expect(sb).toHaveAttribute('aria-modal', 'true')
      await expect(sb).toHaveAccessibleName(/.+/)
      expect(await page.evaluate(() => document.querySelector('.main-wrap')!.hasAttribute('inert'))).toBe(true)
      expect((await active(page)).inSidebar, 'focus placed inside drawer').toBe(true)
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
      const n = await drawerFocusables(page)
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < n + 5; i++) {
          await page.keyboard.press(key)
          const a = await active(page)
          expect(a.inSidebar, `${key} #${i + 1}/${n + 5} → ${a.tag} ${a.text}`).toBe(true)
        }
      }
      // search narrows the list; cycle still contained
      await sb.getByTestId('algo-search').click()
      await page.keyboard.type('归并')
      const n2 = await drawerFocusables(page)
      expect(n2).toBeLessThan(n)
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < n2 + 4; i++) {
          await page.keyboard.press(key)
          expect((await active(page)).inSidebar, `${key} after filter #${i + 1}`).toBe(true)
        }
      }
      await page.keyboard.press('Escape')
      await expect(sb).not.toHaveAttribute('aria-modal', 'true')
      await expect(menu).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(await page.evaluate(() => document.querySelector('.main-wrap')!.hasAttribute('inert'))).toBe(false)
    })

    test('backdrop click, close button and link close + restore; resize to 961 closes', async ({ page }) => {
      await page.setViewportSize(vp)
      await open(page, '#/algo/lcs')
      const menu = page.getByTestId('menu-btn')
      const sb = page.getByTestId('app-sidebar')
      // backdrop
      await menu.click()
      await expect(sb).toHaveAttribute('aria-modal', 'true')
      await page.mouse.click(vp.width - 8, vp.height / 2)
      await expect(sb).not.toHaveAttribute('aria-modal', 'true')
      await expect(menu).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      // close button
      await menu.click()
      await page.getByTestId('mobile-drawer-close').click()
      await expect(menu).toBeFocused()
      // link
      await menu.click()
      await sb.getByTestId('algo-search').click()
      await page.keyboard.type('归并')
      await sb.getByRole('link', { name: '归并排序' }).click()
      await expect(page).toHaveURL(/mergeSort$/)
      await expect(sb).not.toHaveAttribute('aria-modal', 'true')
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect((await active(page)).tag).not.toBe('BODY')
      // resize out of mobile while open
      await menu.click()
      await expect(sb).toHaveAttribute('aria-modal', 'true')
      await page.setViewportSize({ width: 961, height: vp.height })
      await expect(sb).not.toHaveAttribute('aria-modal', 'true')
      await expect(sb).not.toHaveAttribute('role', 'dialog')
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
      expect(await page.evaluate(() => document.querySelector('.main-wrap')!.hasAttribute('inert'))).toBe(false)
      expect((await active(page)).tag).not.toBe('BODY')
      await page.setViewportSize({ width: 960, height: vp.height })
      await expect(sb).not.toHaveAttribute('aria-modal', 'true')
    })
  })
}

test('V33-02 desktop popover is not a page-wide focus trap', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await open(page, '#/algo/lcs')
  await page.getByTestId('catalog-entry').click()
  await expect(page.getByTestId('catalog-pop')).toBeVisible()
  expect(await page.evaluate(() => document.querySelector('.main-wrap')!.hasAttribute('inert'))).toBe(false)
  await expect(page.getByTestId('catalog-pop')).not.toHaveAttribute('aria-modal', 'true')
})

test.describe('V33-03 responsive default follows breakpoint until the user chooses', () => {
  const sbW = (page: Page) => page.evaluate(() => Math.round(document.querySelector('.sidebar')!.getBoundingClientRect().width))

  for (const seq of [
    [1366, 1920, 1366],
    [1920, 1366, 1920],
  ]) {
    test(`auto ${seq.join('→')}`, async ({ page }) => {
      await page.setViewportSize({ width: seq[0], height: 900 })
      await open(page, '#/algo/lcs')
      await runAndStepOnce(page)
      const before = await wbState(page)
      const widths: number[] = []
      for (const w of seq) {
        await page.setViewportSize({ width: w, height: 900 })
        await page.waitForTimeout(300)
        widths.push(await sbW(page))
        if (w <= 1439) expect(await sbW(page), `at ${w}`).toBeLessThanOrEqual(64)
        else expect(await sbW(page), `at ${w}`).toBeGreaterThan(200)
      }
      const after = await wbState(page)
      test.info().annotations.push({ type: 'widths', description: JSON.stringify({ widths, before, after }) })
      expect({ runId: after.runId, step: after.step, solveCount: after.solveCount }).toEqual({ runId: before.runId, step: before.step, solveCount: before.solveCount })
      expect(Math.abs((after.cmTop ?? 0) - (before.cmTop ?? 0))).toBeLessThanOrEqual(1)
    })
  }

  test('manual choice wins over later breakpoint changes', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await open(page, '#/algo/lcs')
    await runAndStepOnce(page)
    const before = await wbState(page)
    await page.getByTestId('desktop-collapse-btn').click() // user expands at 1366
    expect(await sbW(page)).toBeGreaterThan(200)
    for (const w of [1920, 1366, 1200]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(300)
      expect(await sbW(page), `user-expanded kept at ${w}`).toBeGreaterThan(200)
    }
    await page.getByTestId('desktop-collapse-btn').click() // user collapses
    for (const w of [1920, 1366]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(300)
      expect(await sbW(page), `user-collapsed kept at ${w}`).toBeLessThanOrEqual(64)
    }
    const after = await wbState(page)
    expect({ runId: after.runId, step: after.step, solveCount: after.solveCount }).toEqual({ runId: before.runId, step: before.step, solveCount: before.solveCount })
  })
})
