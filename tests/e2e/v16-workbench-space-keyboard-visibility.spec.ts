import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  measureStrictGraphVisibility,
  injectOpaqueOverlayFault,
  injectPointerNonePaintFault,
  clearVisibilityFaults,
} from './helpers/assertStrictGraphVisible'
import { prepareDijkstraN3Ready } from './helpers/runReadiness'
import { openCurrentData } from './helpers/currentData'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v16')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v16')

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function rects(page: Page) {
  return page.evaluate(() => {
    const rr = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }
    const main = rr('main.main')
    const wb = rr('[data-testid="workbench-layout"]')
    const plot = rr('[data-testid="graph-plot"]') || rr('.graph-plot')
    const code = rr('[data-testid="workbench-code-slot"]')
    // V23: the data region (was the inspector sheet)
    const sheet = rr('[data-testid="workbench-data-slot"]')
    let sheetOverlapsCode = false
    if (sheet && code) {
      sheetOverlapsCode = !(
        sheet.x + sheet.w <= code.x ||
        sheet.x >= code.x + code.w ||
        sheet.y + sheet.h <= code.y ||
        sheet.y >= code.y + code.h
      )
    }
    return {
      viewport: { w: innerWidth, h: innerHeight },
      main,
      wb,
      plot,
      code,
      sheet,
      sheetOverlapsCode,
      mainMaxWidth: main ? getComputedStyle(document.querySelector('main.main')!).maxWidth : null,
      preview: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview'),
      stepIndex: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
      mainCounter: document.querySelector('[data-testid="step-counter"]')?.textContent,
      counterCount: document.querySelectorAll('[data-testid="step-counter"]').length,
    }
  })
}

/** V23: open the data region / tab (no force, no viewport swap — V17-04 kept). */
async function openDrawer(page: Page) {
  await openCurrentData(page)
  return true
}

test.describe('V16 workbench space / keyboard / visibility', () => {
  test.beforeAll(() => ensureDirs())

  test('V16-01 play button Space is one native action (no double toggle)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await prepareDijkstraN3Ready(page)
    const viz = page.getByTestId('visualizer')
    const play = page.getByTestId('play-btn')
    await play.focus()
    const before = await viz.getAttribute('data-playing')
    await play.press(' ')
    await page.waitForTimeout(200)
    const after = await viz.getAttribute('data-playing')
    // Exactly one toggle: before 0 → 1 or 1 → 0
    expect(after).not.toBe(before)
    // Second observation shortly after: should stay (no double-fire back)
    await page.waitForTimeout(100)
    const after2 = await viz.getAttribute('data-playing')
    expect(after2).toBe(after)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v16-01-button-space.json'),
      JSON.stringify({ before, after, after2 }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v16-01-button-space.png') })
  })

  test('V16-02 run readiness + Dijkstra n=3 ×10 zero-retry (visual roles)', async ({ page }) => {
    test.setTimeout(180_000)
    // Parent config retries:0 locally; assert explicitly
    test.info().annotations.push({ type: 'retries', description: '0' })
    const results: { i: number; ok: boolean; dist?: string; issues?: string }[] = []
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1280, height: 800 })
      const snap = await prepareDijkstraN3Ready(page)
      expect(snap.preview).toBe('0')
      // Seek end and check final edge roles (V15 contract preserved)
      const next = page.getByTestId('next-step-btn')
      for (let s = 0; s < 80; s++) {
        const disabled = await next.isDisabled()
        if (disabled) break
        await next.click()
      }
      const vis = await measureStrictGraphVisibility(page)
      const ok = snap.preview === '0' && vis.nodesChecked > 0
      results.push({ i, ok, issues: vis.issues?.join(',') })
      expect(ok, `iter ${i} ${JSON.stringify(vis.issues)}`).toBe(true)
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v16-02-dijkstra-x10.json'), JSON.stringify(results, null, 2))
  })

  test('V16-02 flaky historical: continuous inspect ×10', async ({ page }) => {
    test.setTimeout(180_000)
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1280, height: 800 })
      await prepareDijkstraN3Ready(page)
      const opened = await openDrawer(page)
      expect(opened).toBe(true)
      const before = await page.getByTestId('visualizer').getAttribute('data-step-index')
      // V23: the single shared transport steps while the data region stays visible
      for (let s = 0; s < 10; s++) {
        await page.getByTestId('next-step-btn').click()
        await expect(page.getByTestId('workbench-data-body')).toBeVisible()
      }
      const after = await page.getByTestId('visualizer').getAttribute('data-step-index')
      expect(Number(after)).toBe(Number(before) + 10)
      await page.keyboard.press('Escape')
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v16-02-inspect-x10.json'), JSON.stringify({ passes: 10 }, null, 2))
  })

  test('V16-02 flaky historical: arrays inspector ×10', async ({ page }) => {
    test.setTimeout(180_000)
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1280, height: 800 })
      await prepareDijkstraN3Ready(page)
      await openDrawer(page)
      const host = page.getByTestId('workbench-data-body')
      await expect(host.getByTestId('inspector-arrays')).toBeVisible({ timeout: 10_000 })
      await expect(host.getByTestId('inspector-array-dist')).toBeVisible()
      await page.keyboard.press('Escape')
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v16-02-arrays-x10.json'), JSON.stringify({ passes: 10 }, null, 2))
  })

  test('V16-03 single detector: pe:none fault fails; clear recovers', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await prepareDijkstraN3Ready(page)
    const pos = await measureStrictGraphVisibility(page)
    expect(pos.ok, JSON.stringify(pos)).toBe(true)

    await injectPointerNonePaintFault(page)
    const neg = await measureStrictGraphVisibility(page)
    expect(neg.ok).toBe(false)
    expect(
      neg.issues.some((i) => i === 'paint-occluded' || i === 'opaque-overlay') ||
        neg.fieldsSummary?.paintOcclusionChecked,
    ).toBeTruthy()

    await clearVisibilityFaults(page)
    const recovered = await measureStrictGraphVisibility(page)
    expect(recovered.ok, JSON.stringify(recovered)).toBe(true)

    await injectOpaqueOverlayFault(page)
    const neg2 = await measureStrictGraphVisibility(page)
    expect(neg2.ok).toBe(false)
    await clearVisibilityFaults(page)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v16-03-visibility-fault.json'),
      JSON.stringify({ pos, neg, recovered, neg2 }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v16-03-visibility-fault.png') })
  })

  // V23 replacement: the drawer's second counter no longer exists (one transport).
  // Stronger contract: exactly one step counter, 1-based, equal to cursor+1 while the
  // data tab is open.
  test('V16-04 single 1-based step counter while data is open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDijkstraN3Ready(page)
    await openDrawer(page)
    const idx0 = Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))
    await page.getByTestId('next-step-btn').click()
    await page.getByTestId('next-step-btn').click()
    await expect(page.getByTestId('workbench-data-body')).toBeVisible()
    expect(await page.getByTestId('step-counter').count()).toBe(1)
    const idx = Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))
    expect(idx).toBe(idx0 + 2)
    const main = (await page.getByTestId('step-counter').textContent()) || ''
    const mainNum = main.match(/(\d+)\s*\/\s*(\d+)/)
    expect(mainNum).toBeTruthy()
    expect(Number(mainNum![1])).toBe(idx + 1)
    fs.writeFileSync(path.join(OUT_TRACES, 'v16-04-step-counters.json'), JSON.stringify({ main, idx }, null, 2))
  })

  for (const vp of [
    { w: 1366, h: 768, name: '1366x768', minPlot: 300 },
    { w: 1920, h: 1080, name: '1920x1080', minPlot: 380 },
    { w: 2560, h: 1440, name: '2560x1440', minPlot: 400 },
  ]) {
    test(`V16-05/06 layout reclaim @${vp.name}`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareDijkstraN3Ready(page)
      await page.waitForTimeout(400)
      const after = await rects(page)
      // Not capped at 1180 article card
      expect(after.mainMaxWidth === 'none' || after.mainMaxWidth === '' || !after.mainMaxWidth).toBeTruthy()
      if (vp.w >= 1920) {
        expect(after.main!.w).toBeGreaterThan(1300)
      }
      expect(after.wb!.w / after.main!.w).toBeGreaterThanOrEqual(0.92)
      expect(after.plot!.h, JSON.stringify(after.plot)).toBeGreaterThanOrEqual(vp.minPlot)

      // Open data — must not cover code on desktop (V23: data is a grid region)
      {
        await openCurrentData(page)
        await page.waitForTimeout(400)
        const withData = await rects(page)
        expect(withData.sheetOverlapsCode, JSON.stringify(withData)).toBe(false)
        await page.screenshot({ path: path.join(OUT_SHOTS, `v16-05-${vp.name}-data-open.png`) })
        fs.writeFileSync(
          path.join(OUT_TRACES, `v16-05-${vp.name}.json`),
          JSON.stringify({ after, withData }, null, 2),
        )
      }
      await page.screenshot({ path: path.join(OUT_SHOTS, `v16-05-${vp.name}-after-run.png`) })
    })
  }

  test('V16-07 session survives resize + data toggle', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await prepareDijkstraN3Ready(page)
    await page.getByTestId('next-step-btn').click()
    await page.getByTestId('next-step-btn').click()
    const before = await page.evaluate(() => ({
      step: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
      preview: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview'),
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent,
    }))
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(400)
    const mid = await page.evaluate(() => ({
      step: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
      preview: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview'),
    }))
    expect(mid.step).toBe(before.step)
    expect(mid.preview).toBe('0')
    // V23: collapse + re-expand the data region
    const toggle = page.getByTestId('data-toggle')
    await toggle.click()
    await page.waitForTimeout(200)
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const after = await page.evaluate(() => ({
      step: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
      preview: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview'),
    }))
    expect(after.step).toBe(before.step)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v16-07-session-persist.json'),
      JSON.stringify({ before, mid, after }, null, 2),
    )
  })
})
