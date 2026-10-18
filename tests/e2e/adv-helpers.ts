/** Shared helpers for the 高阶算法 specs: real mouse/keyboard only; page.evaluate is read-only. */
import { expect, type Page } from '@playwright/test'

export async function open(page: Page, hash: string, vp = { width: 1366, height: 768 }) {
  await page.setViewportSize(vp)
  await page.addInitScript(() => {
    localStorage.setItem('adv-lab-theme', 'lab-dark')
  })
  await page.goto(hash)
  await expect(page.getByTestId('app-sidebar')).toBeAttached()
  // [FI] fault injection: same detectors run against a deliberately broken page
  const f = process.env.ADV_FAULT
  if (f === 'hide-tree') {
    await page.evaluate(() => {
      const st = document.createElement('style')
      st.textContent = '[data-testid="adv-scene"]{visibility:hidden!important}'
      document.head.appendChild(st)
    })
  }
}

export async function sceneAudit(page: Page, nodeTestId: string, minCount = 1) {
  const scene = page.getByTestId('adv-scene')
  await expect(scene).toBeVisible()
  const nodes = page.getByTestId(nodeTestId)
  expect(await nodes.count()).toBeGreaterThanOrEqual(minCount)
  const sb = (await scene.boundingBox())!
  const bad = await nodes.evaluateAll(
    (els, box) =>
      els.filter((e) => {
        const r = e.getBoundingClientRect()
        return !(r.width > 2 && r.height > 2 && r.left >= box.x - 1 && r.right <= box.x + box.w + 1 && r.top >= box.y - 1 && r.bottom <= box.y + box.h + 1)
      }).length,
    { x: sb.x, y: sb.y, w: sb.width, h: sb.height },
  )
  expect(bad, `${nodeTestId}: every element painted inside the scene box`).toBe(0)
}

export async function runAndEnd(page: Page) {
  const before = Number((await page.getByTestId('adv-demo').getAttribute('data-solve-count')) ?? '0')
  await page.getByTestId('run-btn').click()
  await expect(page.getByTestId('adv-demo')).toHaveAttribute('data-solve-count', String(before + 1), { timeout: 20_000 })
  await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 20_000 })
  const slider = page.getByRole('slider', { name: '步骤进度' })
  await slider.focus()
  await page.keyboard.press('End')
}

export const cells = async (page: Page, row: string): Promise<string[]> =>
  page.locator(`[data-testid="fam-cell"][data-row="${row}"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-value') ?? ''))
export const nums = (xs: string[]) => xs.map((x) => (x === '' ? null : Number(x)))
