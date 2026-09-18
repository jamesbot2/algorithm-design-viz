import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v12')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v12')

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

async function measureOverlap(page: Page, clipToStage = true) {
  return page.evaluate((clipToStage) => {
    const svg = document.querySelector('.graph-svg') as SVGElement | null
    const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
    const inspector = document.querySelector('[data-testid="viz-inspector"]') as HTMLElement | null
    if (!svg || !stage || !inspector) {
      return { ok: false as const, reason: 'missing', hasSvg: !!svg, hasStage: !!stage, hasIns: !!inspector }
    }
    const sr0 = svg.getBoundingClientRect()
    const ir = inspector.getBoundingClientRect()
    const tr = stage.getBoundingClientRect()
    // Painted region = svg ∩ stage (overflow:auto clips paint/hit-test)
    const sr = clipToStage
      ? {
          top: Math.max(sr0.top, tr.top),
          bottom: Math.min(sr0.bottom, tr.bottom),
          left: Math.max(sr0.left, tr.left),
          right: Math.min(sr0.right, tr.right),
          height: 0,
        }
      : { top: sr0.top, bottom: sr0.bottom, left: sr0.left, right: sr0.right, height: sr0.height }
    sr.height = Math.max(0, sr.bottom - sr.top)
    const overlapH = Math.max(0, Math.min(sr.bottom, ir.bottom) - Math.max(sr.top, ir.top))
    const overlapW = Math.max(0, Math.min(sr.right, ir.right) - Math.max(sr.left, ir.left))
    const area = overlapH * overlapW
    const nodes = [...document.querySelectorAll('.graph-svg circle')] as SVGCircleElement[]
    const labels = [...document.querySelectorAll('.graph-svg text')] as SVGTextElement[]
    const hits: { kind: string; blocked: boolean; top: string | null; inStage: boolean }[] = []
    let outOfStage = 0
    // Assert ALL node centers (up to 6) — do not silently skip clipped ones
    for (const el of nodes.slice(0, 6)) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) {
        outOfStage++
        hits.push({ kind: el.tagName, blocked: true, top: null, inStage: false })
        continue
      }
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const inStage = y >= tr.top + 1 && y <= tr.bottom - 1 && x >= tr.left && x <= tr.right
      if (!inStage) {
        outOfStage++
        hits.push({ kind: el.tagName, blocked: true, top: null, inStage: false })
        continue
      }
      const topEl = document.elementFromPoint(x, y)
      const blocked = Boolean(topEl?.closest?.('[data-testid="viz-inspector"]'))
      hits.push({
        kind: el.tagName,
        blocked,
        top: (topEl as HTMLElement | null)?.getAttribute?.('data-testid') ?? topEl?.tagName ?? null,
        inStage: true,
      })
    }
    const inStageHits = hits.filter((h) => h.inStage)
    return {
      ok: true as const,
      svg: { top: sr.top, bottom: sr.bottom, height: sr.height },
      stage: { top: tr.top, bottom: tr.bottom, height: tr.height },
      inspector: { top: ir.top, bottom: ir.bottom, height: ir.height },
      overlapArea: area,
      overlapH,
      hits,
      blockedHits: hits.filter((h) => h.blocked).length,
      inStageHitCount: inStageHits.length,
      outOfStage,
      nodeCount: nodes.length,
      rawSvgBottom: sr0.bottom,
    }
  }, clipToStage)
}

test.describe('V12 stage overlap + settings', () => {
  test.beforeAll(() => ensureDirs())

  test('BFS: before (injected hybrid) overlaps; after fix clean', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await runAlgo(page, '#/algo/bfs')
    await expect(page.getByTestId('graph-view')).toBeVisible()

    await page.addStyleTag({
      content: `
        /* Force the V12 hybrid bug for before evidence */
        .main-wrap[data-lab-fill="1"] .stage-viewport,
        .main-wrap[data-lab-fill="1"] .viz-main {
          flex: 0 0 48px !important;
          min-height: 48px !important;
          max-height: 48px !important;
          overflow: visible !important;
          height: 48px !important;
        }
        .main-wrap[data-lab-fill="1"] .graph-view { height: auto !important; max-height: none !important; overflow: visible !important; }
        .main-wrap[data-lab-fill="1"] .graph-svg {
          height: auto !important;
          min-height: 220px !important;
          max-height: none !important;
        }
        .main-wrap[data-lab-fill="1"] .viz-body-single,
        .main-wrap[data-lab-fill="1"] .visualizer {
          overflow: visible !important;
        }
      `,
    })
    await page.waitForTimeout(250)
    const before = await measureOverlap(page, false)
    // V13: graph mode hides inline inspector — hybrid bug still evidenced by SVG bleed / out-of-stage nodes
    const beforeBad =
      before.ok &&
      (before.overlapArea > 100 ||
        (before.outOfStage ?? 0) > 0 ||
        (before.rawSvgBottom ?? 0) > (before.stage?.bottom ?? 0) + 40)
    expect(beforeBad, JSON.stringify(before)).toBeTruthy()
    fs.writeFileSync(path.join(OUT_TRACES, 'bfs-overlap-before.json'), JSON.stringify(before, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'bfs-overlap-before.png') })

    await page.reload()
    await runAlgo(page, '#/algo/bfs')
    await expect(page.getByTestId('graph-view')).toBeVisible()
    const after = await measureOverlap(page)
    fs.writeFileSync(path.join(OUT_TRACES, 'bfs-overlap-after.json'), JSON.stringify(after, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'bfs-overlap-after.png') })

    expect(after.ok).toBeTruthy()
    expect(after.nodeCount, 'default graph should expose 6 nodes').toBeGreaterThanOrEqual(6)
    expect(after.overlapArea, JSON.stringify(after)).toBeLessThan(8)
    expect(after.inStageHitCount, 'empty in-stage hits must fail').toBeGreaterThanOrEqual(6)
    expect(after.outOfStage, JSON.stringify(after)).toBe(0)
    expect(after.blockedHits, JSON.stringify(after.hits)).toBe(0)
    expect(after.stage!.height, 'stage crushed').toBeGreaterThanOrEqual(120)
    expect(after.svg!.bottom).toBeLessThanOrEqual(after.stage!.bottom + 1.5)
  })

  for (const algo of ['prim', 'dijkstra'] as const) {
    test(`${algo}: GraphView no-overlap contract`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await runAlgo(page, `#/algo/${algo}`)
      await expect(page.getByTestId('graph-view')).toBeVisible()
      const m = await measureOverlap(page)
      fs.writeFileSync(path.join(OUT_TRACES, `${algo}-overlap-after.json`), JSON.stringify(m, null, 2))
      await page.screenshot({ path: path.join(OUT_SHOTS, `${algo}-overlap-after.png`) })
      expect(m.ok).toBeTruthy()
      expect(m.overlapArea).toBeLessThan(8)
      expect(m.blockedHits).toBe(0)
    })
  }

  for (const vp of [
    { w: 844, h: 390, name: '844x390' },
    { w: 900, h: 390, name: '900x390' },
  ]) {
    test(`settings panel usable @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await runAlgo(page, '#/algo/insertionSort')
      const toggle = page.getByTestId('playback-settings-toggle')
      await expect(toggle).toBeVisible()
      await toggle.click()
      const panel = page.getByTestId('playback-settings-panel')
      await expect(panel).toBeVisible()
      const ok = await page.evaluate(() => {
        const p = document.querySelector('[data-testid="playback-settings-panel"]') as HTMLElement | null
        if (!p) return { visible: false }
        const r = p.getBoundingClientRect()
        const speed = p.querySelector('input[type="range"]') as HTMLInputElement | null
        const sr = speed?.getBoundingClientRect()
        const speedHit =
          speed && sr
            ? document.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2)
            : null
        return {
          visible: r.width > 40 && r.height > 40 && r.bottom > r.top,
          portaled: p.getAttribute('data-portaled') === '1',
          inBody: p.parentElement === document.body || document.body.contains(p),
          speedClickable: Boolean(speedHit && (speedHit === speed || speed.contains(speedHit as Node))),
          clippedByTransport: Boolean(
            p.closest('.playback-transport') && getComputedStyle(p.closest('.playback-transport')!).overflow !== 'visible',
          ),
          top: r.top,
          bottom: r.bottom,
          vh: window.innerHeight,
        }
      })
      fs.writeFileSync(path.join(OUT_TRACES, `settings-${vp.name}.json`), JSON.stringify(ok, null, 2))
      await page.screenshot({ path: path.join(OUT_SHOTS, `settings-${vp.name}.png`) })
      expect(ok.visible).toBeTruthy()
      expect(ok.speedClickable).toBeTruthy()
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
    })
  }
})
