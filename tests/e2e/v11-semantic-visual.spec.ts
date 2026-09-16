import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v11')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v11')

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1024x520', width: 1024, height: 520 },
  { name: '1024x500', width: 1024, height: 500 },
  { name: '844x390', width: 844, height: 390 },
]

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function runAlgo(page: Page, route: string) {
  await page.goto(route)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  const edit = page.getByTestId('input-edit-toggle')
  if (await edit.count()) {
    const t = await edit.textContent()
    if (t?.includes('编辑输入')) await edit.click()
  }
  const run = page.getByTestId('run-btn')
  if (await run.count()) await run.click()
  await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })
}

test.describe('V11 semantic/visual smokes', () => {
  test.beforeAll(() => ensureDirs())

  test('insertionSort [2,1] edit→run→mid no crash; board/code present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/insertionSort')
    await expect(page.getByTestId('workbench-layout')).toBeVisible()
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.count()) {
      const t = await edit.textContent()
      if (t?.includes('编辑输入')) await edit.click()
    }
    const arr = page.locator('label.field-array input').first()
    await arr.fill('2,1')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 15_000 })
    for (let i = 0; i < 4; i++) {
      const next = page.getByRole('button', { name: '下一步' })
      if (await next.isEnabled()) await next.click()
    }
    await page.screenshot({ path: path.join(OUT_SHOTS, 'insertionSort-mid-1280x800.png') })
    const canvas = page.getByTestId('viz-canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box && box.height > 40).toBeTruthy()
  })

  test('nQueens end keeps board matrix', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await runAlgo(page, '#/algo/nQueens')
    // scrub to end
    const slider = page.locator('.scrub-row input[type=range]')
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = el.max
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(200)
    const board = page.locator('[data-matrix="board"]')
    await expect(board).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: path.join(OUT_SHOTS, 'nQueens-end-board.png') })
  })

  test('knapsack rejects non-integer weight without solving', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/knapsack01')
    await expect(page.getByTestId('workbench-layout')).toBeVisible()
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.count()) {
      const t = await edit.textContent()
      if (t?.includes('编辑输入')) await edit.click()
    }
    await page.locator('label.field-array', { hasText: '重量' }).locator('input').fill('1.5')
    await page.locator('label.field-array', { hasText: '价值' }).locator('input').fill('10')
    await page.locator('label.field-target', { hasText: '容量' }).locator('input').fill('3')
    await page.getByTestId('run-btn').click()
    await page.waitForTimeout(400)
    const err = page.locator('.input-errors')
    await expect(err).toBeVisible()
    const txt = (await err.textContent()) ?? ''
    expect(txt.includes('整数') || txt.includes('weights')).toBeTruthy()
    fs.writeFileSync(
      path.join(OUT_TRACES, 'knapsack-illegal.json'),
      JSON.stringify({ errorText: txt }, null, 2),
    )
  })

  for (const vp of VIEWPORTS) {
    test(`short-height docks @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await runAlgo(page, '#/algo/kadane')
      if (vp.height <= 520) {
        const toggle = page.getByTestId('playback-settings-toggle')
        await expect(toggle).toBeVisible()
        await toggle.click()
        const panel = page.getByTestId('playback-settings-panel')
        await expect(panel).toBeVisible()
        const dockJump = page.getByTestId('phase-jump-dock')
        // Dock phase jump should remain usable (not display:none)
        if (await dockJump.count()) {
          await expect(dockJump).toBeVisible()
        }
        await page.keyboard.press('Escape')
        await expect(panel).toBeHidden()
      }
      const stage = page.getByTestId('viz-canvas')
      const box = await stage.boundingBox()
      expect(box && box.height >= 100, `stage crushed @${vp.name}`).toBeTruthy()
      await page.screenshot({ path: path.join(OUT_SHOTS, `kadane-${vp.name}.png`) })
    })
  }
})
