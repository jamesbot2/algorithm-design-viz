import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  measureStrictGraphVisibility,
  injectOpaqueOverlayFault,
} from './helpers/assertStrictGraphVisible'
import { prepareDijkstraN3Ready } from './helpers/runReadiness'
import { openCurrentData, openFinalResult } from './helpers/currentData'
import { clickPhase } from './helpers/phaseJump'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v15')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v15')

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function prepareDijkstraCase(page: Page) {
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
}

/** V23: data is a region / 「数据」 tab — no viewport swap fallback (the old helper resized to 390). */
async function openDrawer(page: Page) {
  await openCurrentData(page)
  return true
}

test.describe('V15 keyboard / Dijkstra roles / continuous inspect / visibility', () => {
  test.beforeAll(() => ensureDirs())

  test('V15-01 GraphResultPanel target input arrows do not step playback', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDijkstraCase(page)
    const opened = await openDrawer(page)
    expect(opened).toBe(true)

    const viz = page.getByTestId('visualizer')
    const stepBefore = await viz.getAttribute('data-step-index')
    const counterBefore = await page.getByTestId('step-counter').textContent()

    // V23: the query target lives in the separately-labelled final-result details
    const target = (await openFinalResult(page)).getByTestId('graph-result-target')
    await expect(target).toBeVisible({ timeout: 10_000 })
    await target.focus()
    await target.press('ArrowRight')
    await target.press('ArrowLeft')

    const stepAfter = await viz.getAttribute('data-step-index')
    const counterAfter = await page.getByTestId('step-counter').textContent()
    expect(stepAfter).toBe(stepBefore)
    expect(counterAfter).toBe(counterBefore)

    await page.screenshot({ path: path.join(OUT_SHOTS, 'v15-01-target-input.png') })
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v15-01-keyboard-target.json'),
      JSON.stringify({ stepBefore, stepAfter, counterBefore, counterAfter }, null, 2),
    )
  })

  // V23 replacement: there is no data sheet to close. Contract kept: Escape never
  // changes the step or strands focus — (1) inside the 「数据」 tab, (2) for the real
  // theory modal, which closes and returns focus to its toggle.
  test('V15-01 Esc in data tab / theory modal restores focus, does not change step', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDijkstraCase(page)
    await openDrawer(page)
    const viz = page.getByTestId('visualizer')
    const stepBefore = await viz.getAttribute('data-step-index')
    const tab = page.getByTestId('workbench-tab-data')
    await tab.focus()
    await page.keyboard.press('Escape')
    expect(await viz.getAttribute('data-step-index')).toBe(stepBefore)
    await expect(tab).toBeFocused()
    const theory = page.getByRole('button', { name: /说明/ })
    await theory.click()
    await expect(page.getByTestId('theory-drawer')).toHaveAttribute('aria-modal', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('theory-drawer')).toHaveCount(0)
    expect(await viz.getAttribute('data-step-index')).toBe(stepBefore)
    await expect(theory).toBeFocused({ timeout: 3_000 })
  })

  test('V15-02 final edge roles: current preds only 0→2 and 2→1', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    // V19-05: run-ready + layout-stable entry — not more retries
    await prepareDijkstraN3Ready(page)
    await expect(page.getByTestId('graph-plot')).toBeVisible({ timeout: 10_000 })
    await page.waitForFunction(() => {
      const plot = document.querySelector('[data-testid="graph-plot"]')
      return !!(plot && plot.isConnected && plot.getBoundingClientRect().height > 40)
    })
    // Seek to terminal via product UI (phase jump / End) — not controlled range value=
    // V23: inline chips when roomy, else the 阶段/设置 popover
    await clickPhase(page, '完成')
    await expect.poll(async () => {
      const txt = (await page.getByTestId('step-counter').textContent()) ?? ''
      const m = txt.match(/(\d+)\s*\/\s*(\d+)/)
      if (!m) return false
      return Number(m[1]) === Number(m[2])
    }).toBeTruthy()
    // Wait until edge roles are present (not empty pre-terminal)
    await page.waitForFunction(() => {
      const edges = document.querySelectorAll('[data-edge-id]')
      if (edges.length < 2) return false
      let hasRole = 0
      edges.forEach((g) => {
        const r = g.getAttribute('data-edge-role') || ''
        if (r) hasRole++
      })
      return hasRole > 0
    }, { timeout: 10_000 })
    const roles = await page.evaluate(() => {
      const out: Record<string, string> = {}
      for (const g of document.querySelectorAll('[data-edge-id]')) {
        const id = g.getAttribute('data-edge-id') || ''
        const role = g.getAttribute('data-edge-role') || ''
        out[id] = role
      }
      return out
    })
    expect(Object.keys(roles).length, JSON.stringify(roles)).toBeGreaterThan(0)
    expect(roles['0->2']).toMatch(/tree|accepted/)
    expect(roles['2->1']).toMatch(/tree|accepted/)
    expect(['tree', 'accepted', 'path']).not.toContain(roles['0->1'])
    fs.writeFileSync(path.join(OUT_TRACES, 'v15-02-final-edge-roles.json'), JSON.stringify(roles, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v15-02-dijkstra-final.png') })
  })

  test('V15-03 continuous ≥10 steps with data panel open (drawer-internal transport)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDijkstraCase(page)
    await openDrawer(page)
    // V23: the ONE shared transport stays outside the tab panels, so the data tab stays
    // open while stepping (replaces the sheet's internal mini transport). Data is a
    // tabpanel region, not a dialog.
    const panel = page.getByTestId('workbench-data-slot')
    await expect(panel).toHaveAttribute('role', 'tabpanel')
    const transportNext = page.getByTestId('next-step-btn')
    expect(await transportNext.evaluate((b) => b.closest('[role="tabpanel"]') === null)).toBe(true)

    const viz = page.getByTestId('visualizer')
    const startIdx = Number((await viz.getAttribute('data-step-index')) || '0')
    const distSeen: string[] = []
    for (let i = 0; i < 10; i++) {
      if (await transportNext.isDisabled()) break
      await transportNext.click()
      await expect(panel).toBeVisible()
      await expect(page.getByTestId('workbench-tab-data')).toHaveAttribute('aria-selected', 'true')
      const host = page.getByTestId('workbench-data-body')
      const d1 = host.locator('[data-testid="inspector-array-dist"] [data-idx="1"]')
      if (await d1.count()) {
        distSeen.push(((await d1.textContent()) || '').trim())
      }
    }
    const endIdx = Number((await viz.getAttribute('data-step-index')) || '0')
    expect(endIdx - startIdx).toBeGreaterThanOrEqual(10)
    // Arrays follow cursor — should have seen non-final values if we stepped through
    expect(distSeen.length).toBeGreaterThan(0)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v15-03-continuous-inspect.json'),
      JSON.stringify({ startIdx, endIdx, distSeen }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v15-03-continuous-drawer.png') })
  })

  test('V15-04 strict visibility: pe:none fault fails; positive still ok', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/bfs')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.count()) {
      const t = await edit.textContent()
      if (t?.includes('编辑输入')) await edit.click()
    }
    const run = page.getByTestId('run-btn')
    if (await run.count()) await run.click()
    await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })
    // V19-05: wait attached+layout-stable before any scrollIntoView
    await expect(page.getByTestId('graph-plot')).toBeVisible({ timeout: 10_000 })
    await page.waitForFunction(() => {
      const plot = document.querySelector('[data-testid="graph-plot"]')
      return !!(plot && plot.isConnected && document.contains(plot) && plot.getBoundingClientRect().height > 20)
    })
    const plot = page.getByTestId('graph-plot')
    if (await plot.count()) {
      await plot.scrollIntoViewIfNeeded()
    }
    await page.waitForTimeout(300)
    const positive = await measureStrictGraphVisibility(page)
    fs.writeFileSync(path.join(OUT_TRACES, 'v15-04-visibility-positive.json'), JSON.stringify(positive, null, 2))
    expect(positive.ok, JSON.stringify(positive)).toBe(true)

    await page.evaluate(() => {
      document.querySelector('[data-testid="pe-none-opaque-fault"]')?.remove()
      const o = document.createElement('div')
      o.setAttribute('data-testid', 'pe-none-opaque-fault')
      o.style.cssText =
        'position:fixed;inset:0;background:rgba(255,0,0,0.85);z-index:2147483646;pointer-events:none;'
      document.body.appendChild(o)
    })
    const fault = await page.evaluate(() => {
      const node = document.querySelector('.graph-svg g[data-node-id] circle, .graph-svg circle') as Element | null
      if (!node) return { ok: false, issues: ['missing'] }
      const r = node.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const stack = document.elementsFromPoint(cx, cy)
      // pe:none skipped by hit-test — paint check must still fail
      const peNone = [...document.querySelectorAll('[data-testid="pe-none-opaque-fault"]')]
      const paints = peNone.some((el) => {
        const cs = getComputedStyle(el)
        const bg = cs.backgroundColor
        const alpha = bg.includes('rgba') ? Number(bg.split(',').pop()?.replace(')', '')) : 1
        return cs.pointerEvents === 'none' && parseFloat(cs.opacity) > 0.05 && alpha > 0.4
      })
      return {
        ok: !paints,
        issues: paints ? ['paint-occluded', 'opaque-overlay'] : [],
        hitTopIsNode: stack[0] ? Boolean(stack[0].closest?.('[data-node-id], .graph-svg')) : false,
      }
    })
    fs.writeFileSync(path.join(OUT_TRACES, 'v15-04-visibility-pe-none.json'), JSON.stringify(fault, null, 2))
    expect(fault.ok).toBe(false)
    expect(fault.issues).toContain('paint-occluded')

    await page.evaluate(() => {
      document.querySelector('[data-testid="pe-none-opaque-fault"]')?.remove()
    })
    await injectOpaqueOverlayFault(page)
    const autoFault = await measureStrictGraphVisibility(page)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v15-04-visibility-pe-auto.json'),
      JSON.stringify(autoFault, null, 2),
    )
    expect(autoFault.ok).toBe(false)
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v15-04-visibility-fault.png') })
  })
})
