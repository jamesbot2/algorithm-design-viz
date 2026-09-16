import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1024, height: 500 },
  { width: 900, height: 500 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]

test.describe('V9 viewport visibility + motion', () => {
  for (const vp of VIEWPORTS) {
    test(`kadane stage operable @ ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.goto('#/algo/kadane')
      const wb = page.getByTestId('workbench-layout')
      await expect(wb).toBeVisible({ timeout: 20_000 })

      const run = page.getByTestId('run-btn')
      await expect(run).toBeVisible()
      await run.scrollIntoViewIfNeeded()
      const runBox = await run.boundingBox()
      expect(runBox).toBeTruthy()
      expect((runBox?.height ?? 0)).toBeGreaterThan(10)

      // Hit-test primary run without force:true
      const hit = await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="run-btn"]') as HTMLElement | null
        if (!btn) return null
        btn.scrollIntoView({ block: 'nearest' })
        const r = btn.getBoundingClientRect()
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !!(el && (el === btn || btn.contains(el)))
      })
      expect(hit).toBe(true)

      // Ensure demo tab on narrow layouts
      const demoTab = page.getByRole('tab', { name: '演示' })
      if (await demoTab.isVisible()) await demoTab.click()

      const stageMetrics = await page.evaluate(() => {
        const el = document.querySelector('[data-stage-viewport="1"]') as HTMLElement | null
        if (!el) return null
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
        const style = getComputedStyle(el)
        return {
          h: r.height,
          visible,
          display: style.display,
          visibility: style.visibility,
          hiddenAttr: el.hasAttribute('hidden'),
          heightFallback: document.querySelector('.main-wrap')?.getAttribute('data-height-fallback'),
        }
      })
      expect(stageMetrics).toBeTruthy()
      expect(stageMetrics!.hiddenAttr).toBe(false)
      expect(stageMetrics!.display).not.toBe('none')
      expect(stageMetrics!.h).toBeGreaterThan(80)
      expect(stageMetrics!.visible).toBeGreaterThan(60)

      // Theory must not silently crush stage to ~0 (drawer overlay)
      await page.locator('.theory-toggle').click()
      await expect(page.getByTestId('theory-drawer')).toBeVisible()
      const sh2 = await page.evaluate(() => {
        const el = document.querySelector('[data-stage-viewport="1"]') as HTMLElement | null
        if (!el) return 0
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
      })
      expect(sh2).toBeGreaterThan(40)
      await page.getByTestId('theory-drawer').getByRole('button', { name: '关闭' }).click()
    })
  }

  test('dijkstra: graph is main scene; result not above SVG fighting height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/dijkstra')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 20_000 })
    // Expand input if collapsed
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.isVisible()) await edit.click()
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 30_000 })

    const order = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="viz-canvas"]')
      if (!canvas) return null
      const graph = canvas.querySelector('.graph-view, [data-testid="graph-view"]')
      const resultInCanvas = canvas.querySelector('.graph-result-panel')
      const resultAnywhere = document.querySelector('.graph-result-panel')
      const gr = graph?.getBoundingClientRect()
      return {
        hasGraph: !!graph,
        resultInCanvas: !!resultInCanvas,
        resultInFinal: !!resultAnywhere && !resultInCanvas,
        graphTop: gr?.top ?? null,
        graphH: gr?.height ?? null,
      }
    })
    expect(order?.hasGraph).toBe(true)
    expect(order?.resultInCanvas).toBe(false)
    expect((order?.graphH ?? 0)).toBeGreaterThan(80)
  })

  test('nQueens: board before full search tree (tree aux collapsed)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/nQueens')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0', { timeout: 60_000 })
    const meta = await page.evaluate(() => {
      const board = document.querySelector('[data-matrix="board"]')
      const aux = document.querySelector('[data-testid="search-tree-aux"]')
      const treeInMain = document.querySelector('[data-testid="viz-canvas"] > .search-tree-view')
      const br = board?.getBoundingClientRect()
      const ar = aux?.getBoundingClientRect()
      return {
        hasBoard: !!board,
        hasAux: !!aux,
        treeDefaultOpenAbove: !!treeInMain,
        boardTop: br?.top ?? null,
        auxTop: ar?.top ?? null,
      }
    })
    expect(meta.hasBoard).toBe(true)
    expect(meta.hasAux).toBe(true)
    expect(meta.treeDefaultOpenAbove).toBe(false)
    if (meta.boardTop != null && meta.auxTop != null) {
      expect(meta.boardTop).toBeLessThanOrEqual(meta.auxTop)
    }
  })

  test('V8 mobile tab selector still works', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('#/algo/kadane')
    await expect(page.getByTestId('workbench-layout')).toHaveAttribute('data-layout', 'tabs')
    const inactive = await page.locator('[data-panel][data-tab-active="0"]').first().boundingBox()
    const active = await page.locator('[data-panel][data-tab-active="1"]').first().boundingBox()
    expect((inactive?.width ?? 99)).toBeLessThan(12)
    expect((active?.width ?? 0)).toBeGreaterThan(280)
  })
})
