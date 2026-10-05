/**
 * V28 P4: "Pro Max" design system acceptance in the real app — home library (search, category
 * filter, cards) at five viewports, and the workbench contracts the redesign must not break
 * (three-pane split / mobile tabs, language switcher, follow, theme select by label).
 * Real mouse / keyboard only; no force, no evaluate(click), no scrollIntoView, retries 0.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureCodeExec, tagOf } from './helpers/codeExec'

if (process.env.V28_BASE) test.use({ baseURL: process.env.V28_BASE })
test.describe.configure({ retries: 0 })

const VPS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1024, height: 600 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
]
const vpTag = (vp: { width: number; height: number }) => `viewport=${vp.width}x${vp.height}`

async function home(page: Page, vp: { width: number; height: number }) {
  await page.setViewportSize(vp)
  await page.goto('#/')
  await expect(page.getByTestId('algo-card-grid')).toBeVisible()
}

test.describe('V28 P4 design system', () => {
  for (const vp of VPS) {
    test(`V28-P4-01 home library fits and filters @${vp.width}x${vp.height}`, async ({ page }) => {
      await home(page, vp)
      const geo = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-testid^="algo-card-"]')].filter((e) => e.tagName === 'A')
        return {
          docOverflow: document.documentElement.scrollWidth - window.innerWidth,
          worst: Math.max(...cards.map((c) => c.getBoundingClientRect().right)) - window.innerWidth,
          n: cards.length,
        }
      })
      expect(geo.docOverflow, `${vpTag(vp)}: page scrolls horizontally`).toBeLessThanOrEqual(0)
      expect(geo.worst, `${vpTag(vp)}: a card sticks out of the viewport by ${geo.worst}px`).toBeLessThanOrEqual(0.5)
      expect(geo.n).toBe(23)
      // keyboard: type into the search box
      await page.getByRole('searchbox', { name: '在算法库中搜索' }).click()
      await page.keyboard.type('knapsack')
      await expect(page.getByTestId('home-result-count')).toHaveText(/共 2 个/)
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Backspace')
      await expect(page.getByTestId('home-result-count')).toHaveText(/共 23 个/)
      // category filter (real click; Playwright scrolls the horizontally-scrolling chip row like a user would swipe)
      const graph = page.getByRole('group', { name: '算法分类' }).getByRole('button', { name: /图算法/ })
      await graph.click()
      await expect(graph).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByTestId('home-result-count')).toHaveText(/共 7 个/)
      // card navigation
      await page.getByTestId('algo-card-dijkstra').click()
      await expect(page).toHaveURL(/#\/algo\/dijkstra$/)
      await expect(page.getByTestId('workbench-layout')).toBeVisible()
    })
  }

  for (const vp of VPS) {
    test(`V28-P4-02 workbench contracts after redesign (layout, language switch, follow) @${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto('#/')
      await page.goto('#/algo/dijkstra')
      const wb = page.getByTestId('workbench-layout')
      await expect(wb).toBeVisible()
      const layout = await wb.getAttribute('data-layout')
      expect(layout, vpTag(vp)).toBe(vp.width >= 1000 ? 'split' : 'tabs')
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page)
      for (let i = 0; i < 3; i++) {
        const cur = (await measureCodeExec(page)).frame.stepIndex
        await page.getByTestId('next-step-btn').click()
        await expect.poll(async () => (await measureCodeExec(page)).frame.stepIndex).toBe(cur + 1)
      }
      const before = await measureCodeExec(page)
      if (layout === 'tabs') await page.getByTestId('workbench-tab-code').click()
      await page.getByTestId('tab-lang-python').click()
      const cb = page.getByTestId('code-browser')
      await expect(cb).toHaveAttribute('data-code-loading', '0')
      await expect.poll(async () => {
        const s = await measureCodeExec(page)
        return s.docId === 'dijkstra.naive.py' && s.activeCount === 1 && s.full && s.hit && s.headerAnchor === 'relax.update'
      }).toBe(true)
      const s = await measureCodeExec(page)
      const tag = tagOf(s, 'page default graph')
      expect(s.frame.runId, tag).toBe(before.frame.runId)
      expect(s.frame.stepIndex, tag).toBe(3)
      expect(s.gotoDisabled, tag).toBe(false)
      // topbar theme select keeps its accessible name at every width
      await expect(page.getByLabel('主题')).toBeVisible()
    })
  }
})
