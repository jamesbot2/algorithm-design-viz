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

/** Seek via product UI — phase jump or keyboard End on scrub (not native value= on controlled React range). */
async function seekToEnd(page: Page) {
  // Prefer visible inline phase-jump「完成」(dock copy is display:none when tall).
  // Do not set controlled <input type=range> value via evaluate — React ignores it.
  await expect(page.getByTestId('step-counter')).toBeVisible()
  await expect.poll(async () => {
    const txt = (await page.getByTestId('step-counter').textContent()) ?? ''
    const m = txt.match(/(\d+)\s*\/\s*(\d+)/)
    return m ? Number(m[2]) : 0
  }).toBeGreaterThan(1)

  const inlineDone = page.locator('[data-testid="phase-jump"] button', { hasText: '完成' })
  if (await inlineDone.count()) {
    await inlineDone.first().click()
  } else {
    // Short-height: open settings dock and use phase-jump-dock
    const toggle = page.getByTestId('playback-settings-toggle')
    if (await toggle.isVisible()) {
      await toggle.click()
      await page.locator('[data-testid="phase-jump-dock"] button', { hasText: '完成' }).click()
      await page.keyboard.press('Escape')
    } else {
      const slider = page.locator('.scrub-row input[type=range]')
      await slider.focus()
      await page.keyboard.press('End')
    }
  }

  await expect.poll(async () => {
    const txt = (await page.getByTestId('step-counter').textContent()) ?? ''
    const m = txt.match(/(\d+)\s*\/\s*(\d+)/)
    if (!m) return false
    return Number(m[1]) === Number(m[2])
  }).toBeTruthy()
}

async function assertBarsPainted(page: Page, vpName: string) {
  const stage = page.getByTestId('viz-canvas')
  await expect(stage).toBeVisible()
  const box = await stage.boundingBox()
  expect(box && box.height >= 100, `stage crushed @${vpName}`).toBeTruthy()

  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
    const cr = canvas?.getBoundingClientRect()
    const bars = [...document.querySelectorAll('.bar-col .bar, .bar-col [data-data-height]')] as HTMLElement[]
    const painted = bars
      .map((el) => {
        const r = el.getBoundingClientRect()
        const dh = Number(el.getAttribute('data-data-height') || 0)
        return { h: r.height, dh, top: r.top, bottom: r.bottom }
      })
      .filter((b) => b.h > 4 || b.dh > 0)
    const vh = window.innerHeight
    const visibleInStage = painted.filter((b) => {
      if (!cr || b.h <= 4) return false
      const top = Math.max(b.top, cr.top, 0)
      const bottom = Math.min(b.bottom, cr.bottom, vh)
      return bottom - top > 4
    })
    const neg = document.querySelectorAll('.bar-col.neg').length
    const pos = document.querySelectorAll('.bar-col.pos').length
    return {
      paintedCount: painted.length,
      visibleCount: visibleInStage.length,
      maxVisibleH: visibleInStage.reduce((m, b) => Math.max(m, b.h), 0),
      neg,
      pos,
      stageH: cr?.height ?? 0,
    }
  })
  expect(metrics.paintedCount, `no painted bars @${vpName}`).toBeGreaterThan(0)
  expect(metrics.visibleCount, `bars not visible in stage @${vpName}: ${JSON.stringify(metrics)}`).toBeGreaterThan(0)
  expect(metrics.maxVisibleH, `bar height too small @${vpName}`).toBeGreaterThan(8)
  // Kadane default input has both signs
  expect(metrics.neg, `missing .neg @${vpName}`).toBeGreaterThan(0)
  expect(metrics.pos, `missing .pos @${vpName}`).toBeGreaterThan(0)
  return metrics
}

test.describe('V11 semantic/visual smokes', () => {
  test.beforeAll(() => ensureDirs())

  test('insertionSort [2,1] edit→run→mid shows temp buffer', async ({ page }) => {
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
    const temp = page.locator('[data-array="temp"]')
    await expect(temp).toBeVisible()
    await expect(page.getByTestId('array-buffers')).toBeVisible()
    await expect(temp).toContainText(/temp/)
    const canvas = page.getByTestId('viz-canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box && box.height > 40).toBeTruthy()
    // temp should intersect the stage (not only below the fold)
    const tempInStage = await page.evaluate(() => {
      const t = document.querySelector('[data-array="temp"]')?.getBoundingClientRect()
      const c = document.querySelector('[data-testid="viz-canvas"]')?.getBoundingClientRect()
      if (!t || !c) return false
      return t.bottom > c.top + 4 && t.top < c.bottom - 4
    })
    expect(tempInStage, 'temp buffer not visible inside viz-canvas').toBeTruthy()
    await page.screenshot({ path: path.join(OUT_SHOTS, 'insertionSort-mid-1280x800.png') })
  })

  test('nQueens end keeps board matrix with queens', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await runAlgo(page, '#/algo/nQueens')
    await seekToEnd(page)
    await page.waitForTimeout(300)
    const counter = page.getByTestId('step-counter')
    await expect(counter).toContainText('/ ')
    const counterText = (await counter.textContent()) ?? ''
    // e.g. "113 / 113 · done"
    const m = counterText.match(/(\d+)\s*\/\s*(\d+)/)
    expect(m, `bad counter ${counterText}`).toBeTruthy()
    expect(Number(m![1]), `not last step: ${counterText}`).toBe(Number(m![2]))
    expect(counterText.includes('done') || counterText.includes('完成')).toBeTruthy()
    const board = page.locator('[data-matrix="board"]')
    await expect(board).toBeVisible({ timeout: 10_000 })
    const queenCells = board.locator('td', { hasText: 'Q' })
    await expect(queenCells.first()).toBeVisible()
    expect(await queenCells.count()).toBeGreaterThanOrEqual(4)
    const banner = (await page.getByTestId('viz-banner').textContent()) ?? ''
    expect(/完成|解/.test(banner)).toBeTruthy()
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
        if (await dockJump.count()) {
          await expect(dockJump).toBeVisible()
        }
        await page.keyboard.press('Escape')
        await expect(panel).toBeHidden()
      }
      if (vp.height <= 520) {
        await assertBarsPainted(page, vp.name)
      } else {
        const stage = page.getByTestId('viz-canvas')
        const box = await stage.boundingBox()
        expect(box && box.height >= 100, `stage crushed @${vp.name}`).toBeTruthy()
      }
      await page.screenshot({ path: path.join(OUT_SHOTS, `kadane-${vp.name}.png`) })
    })
  }
})
