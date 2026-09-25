import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  measureStrictGraphVisibility,
  injectOpaqueOverlayFault,
} from './helpers/assertStrictGraphVisible'
import { openCurrentData, backToScene } from './helpers/currentData'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v14')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v14')

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

/**
 * V23: the inline 96px inspector and the portal sheet are gone. Current data is the
 * workbench data region (docked/wide: visible next to the scene; tabbed: the 「数据」
 * tab). "inline" ⇔ region visible without any click; "drawer" ⇔ one tab click away.
 * The contract (vars/arrays reachable, cursor unchanged) is unchanged.
 */
async function inspectorReachable(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element | null) => {
      if (!el || (el as HTMLElement).closest('[hidden]')) return false
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1
    }
    const inlineVisible = vis(document.querySelector('[data-testid="workbench-data-body"]'))
    const toggleReachable = vis(document.querySelector('[data-testid="workbench-tab-data"]'))
    return {
      inlineVisible,
      toggleReachable,
      layout: document.querySelector('[data-testid="workbench-layout"]')?.getAttribute('data-layout-mode'),
      ok: inlineVisible || toggleReachable,
    }
  })
}

async function openInspectorIfNeeded(page: Page) {
  const state = await inspectorReachable(page)
  if (state.inlineVisible) return 'inline' as const
  if (state.toggleReachable) {
    await openCurrentData(page)
    return 'drawer' as const
  }
  throw new Error(`current data unreachable: ${JSON.stringify(state)}`)
}

async function closeInspectorSheet(page: Page) {
  await backToScene(page)
}

async function readInspectorDistParent(page: Page) {
  const mode = await openInspectorIfNeeded(page)
  const host = page.getByTestId('workbench-data-body')
  await expect(host.getByTestId('inspector-arrays')).toBeVisible({ timeout: 8_000 })
  const dist1 = (
    await host.locator('[data-testid="inspector-array-dist"] [data-idx="1"]').textContent()
  )?.trim()
  const parent1 = (
    await host.locator('[data-testid="inspector-array-parent"] [data-idx="1"]').textContent()
  )?.trim()
  const done1 = (
    await host.locator('[data-testid="inspector-array-done"] [data-idx="1"]').textContent()
  )?.trim()
  // Always return to the scene tab so the transport flow is identical to a learner's
  await closeInspectorSheet(page)
  return { dist1, parent1, done1, mode }
}

test.describe('V14 inspector / arrays / pan / visibility', () => {
  test.beforeAll(() => ensureDirs())

  for (const vp of [
    { w: 1366, h: 768, name: '1366x768' },
    { w: 1280, h: 800, name: '1280x800' },
    { w: 768, h: 1024, name: '768x1024' },
    { w: 390, h: 844, name: '390x844' },
    { w: 844, h: 390, name: '844x390' },
  ]) {
    for (const algo of ['bfs', 'dijkstra', 'prim', 'kruskal', 'bellmanFord'] as const) {
      test(`V14-01 ${algo} inspector reachable @${vp.name}`, async ({ page }) => {
        test.setTimeout(90_000)
        await page.setViewportSize({ width: vp.w, height: vp.h })
        await runAlgo(page, `#/algo/${algo}`)
        await expect(page.getByTestId('graph-view')).toBeVisible()
        await page.waitForTimeout(200)
        const beforeStep = await page.getByTestId('visualizer').getAttribute('data-step-index')
        const reach = await inspectorReachable(page)
        fs.writeFileSync(
          path.join(OUT_TRACES, `inspector-${algo}-${vp.name}.json`),
          JSON.stringify({ reach, beforeStep }, null, 2),
        )
        await page.screenshot({
          path: path.join(OUT_SHOTS, `inspector-${algo}-${vp.name}.png`),
        })
        expect(reach.ok, JSON.stringify(reach)).toBe(true)
        await openInspectorIfNeeded(page)
        const host = page.getByTestId('workbench-data-body')
        await expect(host.getByTestId('vars-panel')).toBeVisible()
        const afterStep = await page.getByTestId('visualizer').getAttribute('data-step-index')
        expect(afterStep).toBe(beforeStep)
      })
    }
  }

  for (const vp of [
    { w: 1280, h: 800, name: '1280' },
    { w: 768, h: 1024, name: '768' },
    { w: 390, h: 844, name: '390' },
  ]) {
    test(`V14-02 Dijkstra arrays in inspector @${vp.name}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('#/algo/dijkstra')
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
      const edit = page.getByTestId('input-edit-toggle')
      if (await edit.count()) {
        const t = await edit.textContent()
        if (t?.includes('编辑输入')) await edit.click()
      }
      await page.getByTestId('graph-n').fill('3')
      await page.getByTestId('graph-start').fill('0')
      await page.getByTestId('graph-edges').fill('0 1 10\n0 2 1\n2 1 1')
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })

      // Initial open: tables exist
      await openInspectorIfNeeded(page)
      const firstHost = page.getByTestId('workbench-data-body')
      await expect(firstHost.getByTestId('inspector-arrays')).toBeVisible({ timeout: 10_000 })
      await expect(firstHost.getByTestId('inspector-array-dist')).toBeVisible()
      await expect(firstHost.getByTestId('inspector-array-parent')).toBeVisible()
      await expect(firstHost.getByTestId('inspector-array-done')).toBeVisible()
      await closeInspectorSheet(page)

      const seen = new Set<string>()
      let sawInf = false
      let saw10 = false
      let saw2 = false
      let parentAt2: string | undefined
      const stepTrace: { step: string | null; dist1?: string; parent1?: string }[] = []

      for (let i = 0; i < 60; i++) {
        const snap = await readInspectorDistParent(page)
        const step = await page.getByTestId('visualizer').getAttribute('data-step-index')
        stepTrace.push({ step, dist1: snap.dist1, parent1: snap.parent1 })
        if (snap.dist1) seen.add(snap.dist1)
        if (snap.dist1 === '∞' || snap.dist1 === 'Infinity') sawInf = true
        if (snap.dist1 === '10') saw10 = true
        if (snap.dist1 === '2') {
          saw2 = true
          parentAt2 = snap.parent1
          break
        }
        // Advance with transport click — drawer must be closed so it cannot intercept
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
        await page.waitForTimeout(40)
      }

      fs.writeFileSync(
        path.join(OUT_TRACES, `dijkstra-arrays-${vp.name}.json`),
        JSON.stringify({ seen: [...seen], sawInf, saw10, saw2, parentAt2, stepTrace }, null, 2),
      )
      await page.screenshot({ path: path.join(OUT_SHOTS, `dijkstra-arrays-${vp.name}.png`) })
      expect(sawInf || seen.has('∞') || [...seen].some((v) => v.includes('∞')), 'dist[1] starts ∞').toBeTruthy()
      expect(saw10 || seen.has('10'), 'dist[1] visits 10').toBeTruthy()
      expect(saw2, 'dist[1] becomes 2').toBe(true)
      expect(parentAt2).toBe('2')
    })
  }

  test('V14-03 pan 100px screen ≈ 100px node move + reset-view', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await runAlgo(page, '#/algo/bfs')
    const plot = page.getByTestId('graph-plot')
    await expect(plot).toBeVisible()
    const before = await page.evaluate(() => {
      const c = document.querySelector(
        '.graph-svg g[data-node-id] circle, .graph-svg circle',
      ) as SVGCircleElement | null
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    expect(before).toBeTruthy()
    const box = await plot.boundingBox()
    expect(box).toBeTruthy()
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    const stepBefore = await page.getByTestId('visualizer').getAttribute('data-step-index')
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 100, startY, { steps: 12 })
    await page.mouse.up()
    const after = await page.evaluate(() => {
      const c = document.querySelector(
        '.graph-svg g[data-node-id] circle, .graph-svg circle',
      ) as SVGCircleElement | null
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    expect(after).toBeTruthy()
    const dx = after!.x - before!.x
    fs.writeFileSync(
      path.join(OUT_TRACES, 'pan-100px.json'),
      JSON.stringify({ before, after, dx, expected: 100 }, null, 2),
    )
    expect(Math.abs(dx - 100)).toBeLessThan(25)
    await page.getByTestId('graph-reset-view').click()
    const resetPos = await page.evaluate(() => {
      const c = document.querySelector(
        '.graph-svg g[data-node-id] circle, .graph-svg circle',
      ) as SVGCircleElement | null
      if (!c) return null
      const r = c.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    expect(Math.abs(resetPos!.x - before!.x)).toBeLessThan(15)
    const stepAfter = await page.getByTestId('visualizer').getAttribute('data-step-index')
    expect(stepAfter).toBe(stepBefore)
    await page.screenshot({ path: path.join(OUT_SHOTS, 'pan-reset.png') })
  })

  test('V14-04 positive control passes; opaque overlay fault MUST fail', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await runAlgo(page, '#/algo/bfs')
    // Re-query after run/layout — graph-plot can detach on camera/fit remount
    await expect(page.getByTestId('graph-plot')).toBeVisible({ timeout: 15_000 })
    await page.waitForFunction(() => {
      const plot = document.querySelector('[data-testid="graph-plot"]')
      const nodes = document.querySelectorAll('.graph-svg circle')
      if (!plot || nodes.length < 1) return false
      const r = plot.getBoundingClientRect()
      return r.width > 40 && r.height > 40
    }, { timeout: 10_000 })
    const plot = page.getByTestId('graph-plot')
    await plot.scrollIntoViewIfNeeded()
    await page.waitForTimeout(250)
    const positive = await measureStrictGraphVisibility(page)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'visibility-positive.json'),
      JSON.stringify(positive, null, 2),
    )
    expect(positive.ok, JSON.stringify(positive)).toBe(true)

    await injectOpaqueOverlayFault(page)
    const fault = await measureStrictGraphVisibility(page)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'visibility-fault-opaque.json'),
      JSON.stringify(fault, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'visibility-fault-opaque.png') })
    expect(fault.ok, 'opaque overlay must fail strict helper').toBe(false)
    expect(
      fault.issues.some((i) => i === 'opaque-overlay' || i === 'topmost-not-target'),
      JSON.stringify(fault),
    ).toBe(true)
  })
})
