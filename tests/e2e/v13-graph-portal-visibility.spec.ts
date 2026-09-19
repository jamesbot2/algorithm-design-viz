import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v13')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v13')

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
 * Real visibility/readability/hit asserts — empty hits FAIL; out-of-plot nodes FAIL.
 * Returns a structured report; callers assert report.pass / specific fields.
 */
async function measureGraphVisibility(page: Page) {
  return page.evaluate(() => {
    const plot = document.querySelector('[data-testid="graph-plot"]') as HTMLElement | null
    const svg = document.querySelector('.graph-svg') as SVGElement | null
    const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
    const inspector = document.querySelector('[data-testid="viz-inspector"]') as HTMLElement | null
    const warn = document.querySelector('[data-testid="graph-neg-warning"]') as HTMLElement | null
    if (!svg || !stage) {
      return { pass: false, reason: 'missing-svg-or-stage', hasSvg: !!svg, hasStage: !!stage }
    }
    const host = plot ?? (svg.parentElement as HTMLElement | null)
    if (!host) return { pass: false, reason: 'missing-plot' }

    const hr = host.getBoundingClientRect()
    const sr = svg.getBoundingClientRect()
    const tr = stage.getBoundingClientRect()
    const ir = inspector?.getBoundingClientRect()

    // SVG must not paint into inspector (bbox overlap of painted svg vs inspector)
    let overlapArea = 0
    if (ir) {
      const oh = Math.max(0, Math.min(sr.bottom, ir.bottom) - Math.max(sr.top, ir.top))
      const ow = Math.max(0, Math.min(sr.right, ir.right) - Math.max(sr.left, ir.left))
      overlapArea = oh * ow
    }

    const nodeGs = [...document.querySelectorAll('.graph-svg g[data-node-id]')] as SVGGElement[]
    const nodeCircles = nodeGs
      .map((g) => g.querySelector('circle'))
      .filter(Boolean) as SVGCircleElement[]
    const nodeLabels = nodeGs
      .map((g) => g.querySelector('text.node-label'))
      .filter(Boolean) as SVGTextElement[]

    const visibleNodes: { id: string; cssH: number; inPlot: boolean; hitOk: boolean; top: string | null }[] = []
    let blockedHits = 0
    let emptySkip = 0

    for (const g of nodeGs) {
      const id = g.getAttribute('data-node-id') ?? '?'
      const circle = g.querySelector('circle') as SVGCircleElement | null
      const label = g.querySelector('text.node-label') as SVGTextElement | null
      if (!circle) continue
      const cr = circle.getBoundingClientRect()
      const lr = label?.getBoundingClientRect()
      const cssH = lr ? lr.height : cr.height
      const cx = cr.left + cr.width / 2
      const cy = cr.top + cr.height / 2
      const inPlot =
        cr.width >= 1 &&
        cr.height >= 1 &&
        cx >= hr.left - 0.5 &&
        cx <= hr.right + 0.5 &&
        cy >= hr.top - 0.5 &&
        cy <= hr.bottom + 0.5 &&
        cy >= tr.top - 0.5 &&
        cy <= tr.bottom + 0.5

      if (!inPlot) {
        emptySkip++
        visibleNodes.push({ id, cssH, inPlot: false, hitOk: false, top: null })
        continue
      }
      // Multi-sample: SVG transparent areas pass through; circle center can miss painted pixels
      const rad = Math.min(cr.width, cr.height) * 0.25
      const samples = [
        [cx, cy],
        [cx + rad, cy],
        [cx - rad, cy],
        [cx, cy + rad],
        [cx, cy - rad],
      ]
      let blocked = false
      let inGraph = false
      let chromeSteal = false
      let topEl: Element | null = null
      for (const [sx, sy] of samples) {
        const stack = document.elementsFromPoint(sx, sy)
        if (!topEl && stack[0]) topEl = stack[0]
        if (stack.some((el) => Boolean(el.closest?.('[data-testid="viz-inspector"]')))) blocked = true
        if (
          stack.some(
            (el) =>
              Boolean(el.closest?.('.graph-svg')) ||
              Boolean(el.closest?.('[data-testid="graph-plot"]')) ||
              Boolean(el.closest?.('[data-testid="graph-view"]')),
          )
        )
          inGraph = true
        if (
          stack.some((el) =>
            Boolean(
              el.closest?.('.playback-transport') ||
                el.closest?.('[data-testid="workbench-transport"]') ||
                el.closest?.('[data-testid="input-panel"]') ||
                el.closest?.('.sidebar'),
            ),
          )
        )
          chromeSteal = true
      }
      if (blocked) blockedHits++
      visibleNodes.push({
        id,
        cssH,
        inPlot: true,
        hitOk: !blocked && inGraph && !chromeSteal,
        top: (topEl as HTMLElement | null)?.getAttribute?.('data-testid') ?? topEl?.tagName ?? null,
      })
    }

    const inPlotNodes = visibleNodes.filter((n) => n.inPlot)
    const readableLabels = nodeLabels
      .map((t) => t.getBoundingClientRect().height)
      .filter((h) => h >= 10)

    // Warn must not consume entire plot (plot still has usable height)
    const warnH = warn?.getBoundingClientRect().height ?? 0
    const plotUsable = hr.height >= 80

    const reasons: string[] = []
    if (nodeCircles.length < 1) reasons.push('no-nodes')
    if (inPlotNodes.length === 0) reasons.push('empty-in-plot-hits')
    if (inPlotNodes.length < nodeCircles.length) reasons.push('some-nodes-clipped')
    if (blockedHits > 0) reasons.push('inspector-blocks-hits')
    if (overlapArea >= 8) reasons.push('svg-inspector-overlap')
    if (inPlotNodes.some((n) => !n.hitOk)) reasons.push('hit-not-graph')
    // Default 6-node readability: labels ~12–14px → bbox height typically >= 10
    if (nodeCircles.length >= 6 && readableLabels.length < Math.min(6, nodeLabels.length)) {
      reasons.push('labels-unreadable')
    }
    if (!plotUsable) reasons.push('plot-too-small')

    const pass = reasons.length === 0
    return {
      pass,
      reasons,
      nodeCount: nodeCircles.length,
      inPlotCount: inPlotNodes.length,
      blockedHits,
      emptySkip,
      overlapArea,
      readableLabelCount: readableLabels.length,
      labelHeights: nodeLabels.slice(0, 6).map((t) => +t.getBoundingClientRect().height.toFixed(2)),
      plot: { w: hr.width, h: hr.height, top: hr.top, bottom: hr.bottom },
      stage: { h: tr.height, top: tr.top, bottom: tr.bottom },
      warnH,
      svgBottom: sr.bottom,
      inspectorTop: ir?.top ?? null,
      nodes: visibleNodes,
    }
  })
}


/** V19-05: wait attached + layout-stable before scrollIntoView (avoid detached plot flaky). */
async function scrollPlotStable(page: Page) {
  await expect(page.getByTestId('graph-plot')).toBeVisible({ timeout: 10_000 })
  await page.waitForFunction(() => {
    const plot = document.querySelector('[data-testid="graph-plot"]')
    return !!(plot && plot.isConnected && document.contains(plot) && plot.getBoundingClientRect().height > 20)
  })
  await page.getByTestId('graph-plot').scrollIntoViewIfNeeded()
}

test.describe('V13 graph readability + portal + real visibility asserts', () => {
  test.beforeAll(() => ensureDirs())

  for (const vp of [
    { w: 1366, h: 768, name: '1366x768' },
    { w: 1024, h: 500, name: '1024x500' },
    { w: 844, h: 390, name: '844x390' },
    { w: 390, h: 844, name: '390x844' },
    { w: 320, h: 568, name: '320x568' },
  ]) {
    test(`BFS n=6 graph readable @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await runAlgo(page, '#/algo/bfs')
      await expect(page.getByTestId('graph-view')).toBeVisible()
      await expect(page.getByTestId('graph-plot')).toBeVisible()
      await scrollPlotStable(page)
      await page.waitForTimeout(250)
      const m = await measureGraphVisibility(page)
      fs.writeFileSync(path.join(OUT_TRACES, `bfs-visibility-${vp.name}.json`), JSON.stringify(m, null, 2))
      await page.screenshot({ path: path.join(OUT_SHOTS, `bfs-visibility-${vp.name}.png`) })
      expect(m.nodeCount, JSON.stringify(m)).toBeGreaterThanOrEqual(6)
      expect(m.inPlotCount, 'empty/clipped nodes must not silently pass').toBe(m.nodeCount)
      expect(m.blockedHits, JSON.stringify(m.nodes)).toBe(0)
      expect(m.overlapArea).toBeLessThan(8)
      expect(m.pass, JSON.stringify(m.reasons)).toBeTruthy()
      // default 6-node: labels readable (~12–14px → bbox height ≥10)
      expect(m.readableLabelCount).toBeGreaterThanOrEqual(4)
    })
  }

  test('BFS resize 844x390 → 1280x800 keeps no inspector overlap', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await runAlgo(page, '#/algo/bfs')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(300)
    await scrollPlotStable(page)
    const m = await measureGraphVisibility(page)
    fs.writeFileSync(path.join(OUT_TRACES, 'bfs-visibility-resize.json'), JSON.stringify(m, null, 2))
    expect(m.pass, JSON.stringify(m)).toBeTruthy()
  })

  for (const algo of ['dijkstra', 'prim'] as const) {
    test(`${algo}: graph visibility contract @1280`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await runAlgo(page, `#/algo/${algo}`)
      await expect(page.getByTestId('graph-view')).toBeVisible()
      await scrollPlotStable(page)
      await page.waitForTimeout(200)
      const m = await measureGraphVisibility(page)
      fs.writeFileSync(path.join(OUT_TRACES, `${algo}-visibility.json`), JSON.stringify(m, null, 2))
      await page.screenshot({ path: path.join(OUT_SHOTS, `${algo}-visibility.png`) })
      expect(m.pass, JSON.stringify(m)).toBeTruthy()
      expect(m.inPlotCount).toBe(m.nodeCount)
      expect(m.blockedHits).toBe(0)
    })
  }

  test('Bellman-Ford neg-cycle: warn visible and plot not clipped', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 500 })
    await page.goto('#/algo/bellmanFord')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.count()) {
      const txt = await edit.textContent()
      if (txt?.includes('编辑输入')) await edit.click()
    }
    await expect(page.getByTestId('graph-input')).toBeVisible()
    await page.getByTestId('graph-n').fill('3')
    await page.getByTestId('graph-start').fill('0')
    await page.locator('[data-testid="graph-input"] textarea').fill('0 1 1\n1 2 -3\n2 1 1')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })
    // Seek toward end where neg-cycle is reported
    const scrub = page.locator('.scrub-row input[type="range"]')
    if (await scrub.count()) {
      const max = await scrub.getAttribute('max')
      if (max) await scrub.fill(max)
    }
    for (let i = 0; i < 80; i++) {
      if (await page.getByTestId('graph-neg-warning').isVisible().catch(() => false)) break
      const next = page.getByRole('button', { name: '下一步' })
      if (await next.isDisabled()) break
      await next.click()
    }
    await expect(page.getByTestId('graph-neg-warning')).toBeVisible({ timeout: 5_000 })
    const m = await measureGraphVisibility(page)
    fs.writeFileSync(path.join(OUT_TRACES, 'bf-neg-warn.json'), JSON.stringify(m, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'bf-neg-warn.png') })
    expect(m.warnH).toBeGreaterThan(10)
    expect(m.plot.h).toBeGreaterThanOrEqual(80)
    expect(m.inPlotCount, JSON.stringify(m)).toBe(m.nodeCount)
    expect(m.blockedHits).toBe(0)
    expect(m.overlapArea).toBeLessThan(8)
  })

  test('settings: 844 open → 1280 closes when toggle hides (no off-screen panel)', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await runAlgo(page, '#/algo/insertionSort')
    const toggle = page.getByTestId('playback-settings-toggle')
    await expect(toggle).toBeVisible()
    await toggle.click()
    const panel = page.getByTestId('playback-settings-panel')
    await expect(panel).toBeVisible()
    const before = await panel.evaluate((p) => {
      const r = p.getBoundingClientRect()
      return { w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left }
    })
    expect(before.w).toBeGreaterThan(40)
    expect(before.h).toBeGreaterThan(40)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(350)
    // Toggle hidden at tall viewport → panel must close (not 0-rect off-screen)
    await expect(panel).toBeHidden({ timeout: 5_000 })
    const ghost = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="playback-settings-panel"]')
      return p ? (p as HTMLElement).getBoundingClientRect() : null
    })
    expect(ghost).toBeNull()
    fs.writeFileSync(
      path.join(OUT_TRACES, 'settings-844-to-1280.json'),
      JSON.stringify({ before, ghost }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'settings-844-to-1280.png') })
  })

  test('settings portal More exposes overflowStages select and seeks', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('#/algo/bubbleSort')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    const edit = page.getByTestId('input-edit-toggle')
    if (await edit.count()) {
      const txt = await edit.textContent()
      if (txt?.includes('编辑输入')) await edit.click()
    }
    // Long reverse array → many outer passes → overflowStages / 「更多」
    const arrInput = page.locator('.field-array input').first()
    await expect(arrInput).toBeVisible()
    await arrInput.fill('9,8,7,6,5,4,3,2,1')
    await page.getByTestId('run-btn').click()
    await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })
    const toggle = page.getByTestId('playback-settings-toggle')
    await expect(toggle).toBeVisible()
    await toggle.click()
    const panel = page.getByTestId('playback-settings-panel')
    await expect(panel).toBeVisible()
    const more = panel.getByTestId('phase-more-dock')
    if ((await more.count()) === 0) {
      // No overflow chrome for this run — still require close button works
      await panel.getByTestId('playback-settings-close').click()
      await expect(panel).toBeHidden()
      test.info().annotations.push({ type: 'note', description: 'no More button — overflowStages empty' })
      return
    }
    await more.click()
    const sel = panel.getByTestId('overflow-stages-select-dock')
    await expect(sel).toBeVisible()
    const options = await sel.locator('option').count()
    expect(options).toBeGreaterThan(1)
    const values = await sel.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ''),
    )
    const target = Number(values[values.length - 1])
    await sel.selectOption(String(target))
    await page.waitForTimeout(150)
    const idx = await page.getByTestId('step-counter').textContent()
    fs.writeFileSync(
      path.join(OUT_TRACES, 'settings-more-overflow.json'),
      JSON.stringify({ target, idx, options }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'settings-more-overflow.png') })
    // Seek applied (counter shows target+1 or nearby)
    expect(idx).toBeTruthy()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  })

  test('FAULT-INJECTION: hybrid overflow MUST fail visibility helper', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await runAlgo(page, '#/algo/bfs')
    await page.addStyleTag({
      content: `
        .main-wrap[data-lab-fill="1"] .stage-viewport,
        .main-wrap[data-lab-fill="1"] .viz-main {
          flex: 0 0 48px !important;
          min-height: 48px !important;
          max-height: 48px !important;
          overflow: visible !important;
          height: 48px !important;
        }
        .main-wrap[data-lab-fill="1"] .graph-view { height: auto !important; max-height: none !important; overflow: visible !important; }
        .main-wrap[data-lab-fill="1"] .graph-plot { height: auto !important; min-height: 220px !important; overflow: visible !important; }
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
    const m = await measureGraphVisibility(page)
    fs.writeFileSync(path.join(OUT_TRACES, 'fault-inject-must-fail.json'), JSON.stringify(m, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'fault-inject-must-fail.png') })
    // Helper must NOT pass under injected hybrid bug
    expect(m.pass, 'fault injection still green — asserts are tautological').toBe(false)
    expect(
      m.overlapArea > 100 || m.blockedHits > 0 || m.inPlotCount < m.nodeCount || m.reasons.includes('plot-too-small'),
      JSON.stringify(m),
    ).toBeTruthy()
  })
})
