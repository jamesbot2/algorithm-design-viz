import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v4')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v4')

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

type Box = { x: number; y: number; w: number; h: number }

async function measure(page: Page) {
  return page.evaluate(() => {
    const rect = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const cmScroll = document.querySelector('.cm-scroller') as HTMLElement | null
    return {
      workbench: rect('[data-testid="workbench-layout"]'),
      canvas: rect('[data-testid="viz-canvas"]'),
      code: rect('[data-testid="code-browser"]'),
      input: rect('[data-testid="input-panel"]'),
      transport: rect('.viz-toolbar'),
      scrollY: window.scrollY,
      codeScrollTop: cmScroll?.scrollTop ?? 0,
      mountWorkbench: document.querySelectorAll('[data-testid="workbench-layout"]').length,
      mountCode: document.querySelectorAll('[data-testid="code-browser"]').length,
      mountViz: document.querySelectorAll('[data-testid="visualizer"]').length,
    }
  })
}

function drift(a: Box | null, b: Box | null) {
  if (!a || !b) return Infinity
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h))
}

async function sampleDuringPlay(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const samples: Array<{
      t: number
      workbench: { x: number; y: number; w: number; h: number } | null
      canvas: { x: number; y: number; w: number; h: number } | null
      code: { x: number; y: number; w: number; h: number } | null
      input: { x: number; y: number; w: number; h: number } | null
      transport: { x: number; y: number; w: number; h: number } | null
      scrollY: number
      codeScrollTop: number
    }> = []
    const rect = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const tick = () => {
        const cmScroll = document.querySelector('.cm-scroller') as HTMLElement | null
        samples.push({
          t: performance.now() - start,
          workbench: rect('[data-testid="workbench-layout"]'),
          canvas: rect('[data-testid="viz-canvas"]'),
          code: rect('[data-testid="code-browser"]'),
          input: rect('[data-testid="input-panel"]'),
          transport: rect('.viz-toolbar'),
          scrollY: window.scrollY,
          codeScrollTop: cmScroll?.scrollTop ?? 0,
        })
        if (performance.now() - start >= duration) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    return samples
  }, ms)
}

function maxOuterDrift(samples: Awaited<ReturnType<typeof sampleDuringPlay>>) {
  if (samples.length < 2) return 0
  const base = samples[0]!
  let m = 0
  for (const s of samples) {
    m = Math.max(
      m,
      drift(base.workbench, s.workbench),
      drift(base.input, s.input),
      drift(base.transport, s.transport),
      drift(base.code, s.code),
    )
  }
  return m
}

test.describe('V4 A — fail-first gates (must pass after fix)', () => {
  test.beforeAll(() => ensureDirs())

  test('binarySearch init without Run: array preview + code panel + empty exec arrow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1357, height: 743 })
    await page.goto('#/algo/binarySearch')
    await expect(page.getByTestId('workbench-layout')).toBeVisible()
    await expect(page.getByTestId('code-browser')).toBeVisible()
    await expect(page.getByTestId('visualizer')).toBeVisible()
    // Array preview cells present
    await expect(page.locator('.array-view, .array-cells, .bars-wrap').first()).toBeVisible()
    // Exec arrow gutter reserved; arrow may be empty (no ▶ text) or show init anchor
    const arrowCount = await page.locator('.cm-exec-arrow').count()
    // Gutter reserved from init — either 0 arrows (null line) or 1 at init
    expect(arrowCount).toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(OUT_SHOTS, 'binarySearch-init.png'), fullPage: true })
  })

  test('workbench height stable pre-run vs post-run (delta <= 1px)', async ({ page }) => {
    await page.setViewportSize({ width: 1357, height: 743 })
    await page.goto('#/algo/binarySearch')
    await expect(page.getByTestId('workbench-layout')).toBeVisible()
    const before = await measure(page)
    expect(before.workbench).toBeTruthy()
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '0')
    await page.waitForTimeout(200)
    const after = await measure(page)
    const hDelta = Math.abs((before.workbench?.h ?? 0) - (after.workbench?.h ?? 0))
    const yDelta = Math.abs((before.workbench?.y ?? 0) - (after.workbench?.y ?? 0))
    expect(hDelta, `height drift ${hDelta}`).toBeLessThanOrEqual(1)
    expect(yDelta, `y drift ${yDelta}`).toBeLessThanOrEqual(1)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'binarySearch-run-transition.json'),
      JSON.stringify({ before, after, hDelta, yDelta }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'binarySearch-after-run.png'), fullPage: true })
  })
})

const VIEWPORTS = [
  { name: '1357x743', width: 1357, height: 743 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
]

test.describe('V4 E — stability sampling', () => {
  test.beforeAll(() => ensureDirs())

  for (const vp of VIEWPORTS) {
    test(`binarySearch play sample @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('#/algo/binarySearch')
      await page.getByTestId('run-btn').click()
      await expect(page.getByTestId('play-btn')).toBeVisible()
      // Pin window scroll once so play sampling measures drift, not Playwright scroll-into-view
      await page.evaluate(() => {
        const wb = document.querySelector('[data-testid="workbench-layout"]') as HTMLElement | null
        if (wb) {
          const y = Math.max(0, wb.getBoundingClientRect().top + window.scrollY - 8)
          window.scrollTo(0, y)
        }
      })
      await page.waitForTimeout(50)
      const play = page.getByTestId('play-btn')
      await play.click({ force: true })
      const samples = await sampleDuringPlay(page, vp.width < 500 ? 4000 : 8000)
      if ((await play.textContent())?.includes('暂停')) await play.click({ force: true })
      const outer = maxOuterDrift(samples)
      const scrollYs = samples.map((s) => s.scrollY)
      const scrollDrift = Math.max(...scrollYs) - Math.min(...scrollYs)
      const overflowX = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth
      })
      // Control row edge stability
      const controlDrift = (() => {
        const base = samples[0]?.input
        let m = 0
        for (const s of samples) m = Math.max(m, drift(base ?? null, s.input))
        return m
      })()
      const summary = {
        viewport: vp,
        samples: samples.length,
        outerDriftPx: outer,
        scrollYDrift: scrollDrift,
        scrollYFirst: scrollYs[0],
        controlDriftPx: controlDrift,
        overflowX,
        first: samples[0],
        last: samples[samples.length - 1],
      }
      fs.writeFileSync(
        path.join(OUT_TRACES, `binarySearch-play-${vp.name}.json`),
        JSON.stringify(summary, null, 2),
      )
      await page.screenshot({
        path: path.join(OUT_SHOTS, `binarySearch-play-${vp.name}.png`),
      })
      expect(outer, `outer drift ${outer}`).toBeLessThanOrEqual(1)
      expect(scrollDrift, `scrollY drift ${scrollDrift}`).toBeLessThanOrEqual(1)
      expect(controlDrift, `control drift ${controlDrift}`).toBeLessThanOrEqual(1)
      expect(overflowX).toBeLessThanOrEqual(1)
    })
  }

  test('code visible; manual scroll pauses follow; no window scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/binarySearch')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('code-browser')).toBeVisible()
    const y0 = await page.evaluate(() => window.scrollY)
    const scroller = page.locator('.cm-scroller')
    await scroller.evaluate((el) => {
      el.scrollTop = 80
    })
    await page.waitForTimeout(100)
    // Follow should pause — 回到执行行 button available
    await expect(page.getByRole('button', { name: '回到执行行' })).toBeVisible()
    const y1 = await page.evaluate(() => window.scrollY)
    expect(Math.abs(y1 - y0)).toBeLessThanOrEqual(1)
  })

  test('LCS / nQueens / dijkstra / knapsack teach paths', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    for (const route of ['#/algo/lcs', '#/algo/nQueens', '#/algo/dijkstra', '#/teach/knapsack']) {
      await page.goto(route)
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('code-browser')).toBeVisible()
      const run = page.getByTestId('run-btn')
      if (await run.count()) {
        await run.click()
        await page.waitForTimeout(150)
      }
      const safe = route.replace(/[#/]/g, '_')
      await page.screenshot({ path: path.join(OUT_SHOTS, `path${safe}.png`) })
    }
  })

  test('theme switch does not remount workbench', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('#/algo/binarySearch')
    await page.getByTestId('run-btn').click()
    const before = await measure(page)
    const themeSelect = page.getByTestId('workbench-desktop-controls').getByLabel('主题')
    await themeSelect.selectOption('lab-light')
    await page.waitForTimeout(100)
    const after = await measure(page)
    expect(after.mountWorkbench).toBe(1)
    expect(after.mountCode).toBe(1)
    expect(drift(before.workbench, after.workbench)).toBeLessThanOrEqual(2)
  })
})
