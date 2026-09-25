import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { openCurrentData, backToScene } from './helpers/currentData'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v10')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v10')

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '1024x521', width: 1024, height: 521 },
  { name: '1024x500', width: 1024, height: 500 },
  { name: '844x390', width: 844, height: 390 },
]

const ALGOS = [
  { route: '#/algo/binarySearch', edit: false },
  { route: '#/algo/quickSort', edit: true },
  { route: '#/algo/kadane', edit: false },
  { route: '#/algo/lcs', edit: false },
  { route: '#/algo/knapsack01', edit: false },
  { route: '#/algo/dijkstra', edit: false },
  { route: '#/algo/nQueens', edit: false },
  { route: '#/teach/knapsack', edit: false },
]

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function openInputIfNeeded(page: Page, needEdit: boolean) {
  if (!needEdit) return
  const edit = page.getByTestId('input-edit-toggle')
  if (await edit.count()) {
    const t = await edit.textContent()
    if (t?.includes('编辑输入')) await edit.click()
  }
}

async function ensureCodeReachable(page: Page) {
  await expect(page.getByTestId('workbench-layout')).toBeVisible()
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="workbench-layout"]')
    return (el?.clientWidth ?? 0) > 40
  })
  const layout = await page.getByTestId('workbench-layout').getAttribute('data-layout')
  if (layout === 'tabs') {
    await page.getByRole('tab', { name: '代码' }).click()
    await page.waitForFunction(() => {
      const code = document.querySelector('[data-testid="code-browser"]')
      if (!code) return false
      const r = code.getBoundingClientRect()
      return r.width > 40 && r.height > 40
    }, { timeout: 10_000 })
  }
  const code = page.getByTestId('code-browser')
  await expect(code).toBeVisible({ timeout: 10_000 })
  const box = await code.boundingBox()
  expect(box && box.width * box.height > 200, `code crushed layout=${layout}`).toBeTruthy()
  return layout
}

async function elementFromPointHit(page: Page, testId: string) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
    if (!el) return { ok: false, reason: 'missing' }
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) return { ok: false, reason: 'empty-box', r }
    const cx = r.left + r.width / 2
    const cy = r.top + Math.min(r.height / 2, 12)
    const top = document.elementFromPoint(cx, cy)
    const hit = !!top && (top === el || el.contains(top))
    return { ok: hit, reason: hit ? 'hit' : 'obscured', tag: top?.nodeName }
  }, testId)
}

test.describe('V10-07 real workflow acceptance', () => {
  test.beforeAll(() => ensureDirs())

  test('viewport matrix runs edit→run→mid→end with reachable chrome', async ({ page }) => {
    const report: unknown[] = []
    const matrix: { vp: (typeof VIEWPORTS)[number]; algo: (typeof ALGOS)[number] }[] = []
    for (const algo of ALGOS) matrix.push({ vp: VIEWPORTS[1]!, algo })
    matrix.push({ vp: VIEWPORTS[5]!, algo: ALGOS[0]! })
    matrix.push({ vp: VIEWPORTS[6]!, algo: ALGOS[0]! })
    matrix.push({ vp: VIEWPORTS[7]!, algo: ALGOS[2]! })
    matrix.push({ vp: VIEWPORTS[3]!, algo: ALGOS[1]! })

    for (const { vp, algo } of matrix) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(algo.route)
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 20_000 })
      await openInputIfNeeded(page, algo.edit)
      if (algo.edit) {
        const arrayInput = page.locator('label.field-array input, [data-testid="array-input"]').first()
        if (await arrayInput.count()) await arrayInput.fill('3,1,2')
      }
      const layout = await ensureCodeReachable(page)
      if (layout === 'tabs') {
        const demo = page.getByRole('tab', { name: '演示' })
        if (await demo.count()) await demo.click()
      }
      const run = page.getByTestId('run-btn')
      await expect(run).toBeVisible()
      const runHit = await elementFromPointHit(page, 'run-btn')
      await run.click()
      await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', {
        timeout: 60_000,
      })
      await expect(page.getByTestId('play-btn')).toBeVisible()
      for (let i = 0; i < 3; i++) {
        const next = page.getByRole('button', { name: /下一步/ })
        if (await next.count() && (await next.first().isEnabled())) await next.first().click()
      }
      if (vp.height <= 520) {
        // V23: current data is a workbench region/tab (no sheet); same reachability contract.
        const body = await openCurrentData(page)
        await expect(body.getByTestId('current-step-data')).toBeVisible()
        await backToScene(page)
        const settings = page.getByTestId('playback-settings-toggle')
        await expect(settings).toBeVisible()
        await settings.click()
        await expect(page.getByTestId('playback-settings-panel')).toBeVisible()
      }
      const shot = `${algo.route.replace(/[#/]/g, '_')}-${vp.name}.png`
      await page.screenshot({ path: path.join(OUT_SHOTS, shot) })
      report.push({ route: algo.route, viewport: vp, layout, runHit })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'workflow-matrix.json'), JSON.stringify(report, null, 2))
  })

  test('continuous short-height resize keeps vars/speed access', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/binarySearch')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0')
    const chain = [
      { width: 1024, height: 521 },
      { width: 1024, height: 520 },
      { width: 1024, height: 500 },
      { width: 844, height: 390 },
    ]
    const log: unknown[] = []
    for (const vp of chain) {
      await page.setViewportSize(vp)
      await page.waitForTimeout(120)
      // V23: data is reachable at every height (region when docked, 「数据」 tab when tabbed);
      // settings entry always rendered in the transport.
      const settings = page.getByTestId('playback-settings-toggle')
      await expect(settings).toBeVisible()
      const body = await openCurrentData(page)
      await expect(body).toBeVisible()
      await backToScene(page)
      if (vp.height <= 520) {
        await settings.click()
        await expect(page.getByTestId('playback-settings-panel')).toBeVisible()
        // collapse settings for next iteration
        await settings.click()
      }
      log.push({ vp, ok: true })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'short-height-chain.json'), JSON.stringify(log, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'short-height-844x390.png') })
  })

  test('theory drawer dialog Escape returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/binarySearch')
    // V23: the toolbar button is「说明 / 理论」(opens a real modal dialog)
    const toggle = page.getByRole('button', { name: /说明/ })
    await toggle.click()
    const drawer = page.getByTestId('theory-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(toggle).toBeFocused()
  })
})
