import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  prepareDijkstraN3Ready,
  openDataSheet,
  waitForRunReady,
} from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v18')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v18')

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

/** Real hit: target or descendant only — no isVisible() OR. */
async function realHit(page: Page, sel: string) {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement | null
    if (!el) return { ok: false as const, reason: 'missing' }
    const b = el.getBoundingClientRect()
    if (b.width < 2 || b.height < 2) return { ok: false as const, reason: 'tiny' }
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    const ok = !!(top && (top === el || el.contains(top)))
    return {
      ok,
      topTest: top?.getAttribute?.('data-testid') ?? null,
      topClass: String((top as HTMLElement)?.className ?? '').slice(0, 80),
      x: Math.round(b.x),
      y: Math.round(b.y),
      right: Math.round(b.right),
    }
  }, sel)
}

async function measureSheetBody(page: Page) {
  return page.evaluate(() => {
    // V23: the data region body (was the viz-inspector-sheet portal)
    const body = document.querySelector('[data-testid="workbench-data-body"]') as HTMLElement | null
    const cs = body ? getComputedStyle(body) : null
    let rowsVisible = 0
    if (body) {
      const sb = body.getBoundingClientRect()
      document.querySelectorAll('[data-testid="workbench-data-body"] tr').forEach((tr) => {
        const r = (tr as HTMLElement).getBoundingClientRect()
        if (Math.max(0, Math.min(r.bottom, sb.bottom) - Math.max(r.top, sb.top)) > 8) rowsVisible++
      })
    }
    return {
      sheetBodyH: body ? Math.round(body.getBoundingClientRect().height) : 0,
      sheetScrollH: body?.scrollHeight ?? 0,
      sheetClientH: body?.clientHeight ?? 0,
      sheetBodyCssH: cs?.height ?? null,
      sheetBodyMaxH: cs?.maxHeight ?? null,
      sheetBodyMinH: cs?.minHeight ?? null,
      rowsVisible,
      algoDataOpen: document.querySelector('[data-testid="workbench-layout"]')?.getAttribute('data-data-visible'),
      headerRight: Math.round(document.querySelector('.page-header')?.getBoundingClientRect().right ?? 0),
      inputRight: Math.round(
        document.querySelector('[data-testid="input-panel"]')?.getBoundingClientRect().right ?? 0,
      ),
      // V23: data is an in-grid region; header / input must not intersect it at all
      headerOverlapData: (() => {
        const a = document.querySelector('.algo-page h1')?.getBoundingClientRect() // V23 toolbar title (.page-header does not exist)
        const d = document.querySelector('[data-testid="workbench-data-slot"]')?.getBoundingClientRect()
        if (!a || !d) return -1
        return Math.max(0, Math.min(a.right, d.right) - Math.max(a.left, d.left)) * Math.max(0, Math.min(a.bottom, d.bottom) - Math.max(a.top, d.top))
      })(),
      inputOverlapData: (() => {
        const a = document.querySelector('[data-testid="input-panel"]')?.getBoundingClientRect()
        const d = document.querySelector('[data-testid="workbench-data-slot"]')?.getBoundingClientRect()
        if (!a || !d) return -1
        return Math.max(0, Math.min(a.right, d.right) - Math.max(a.left, d.left)) * Math.max(0, Math.min(a.bottom, d.bottom) - Math.max(a.top, d.top))
      })(),
      sheetLeft: Math.round(
        document.querySelector('[data-testid="workbench-data-slot"]')?.getBoundingClientRect().left ?? 0,
      ),
    }
  })
}

async function measureLcsScene(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
    const current = document.querySelector(
      '.matrix-table td.hl-focus, .matrix-table td.hl-write',
    ) as HTMLElement | null
    const matrix =
      (document.querySelector('.matrices-panel') as HTMLElement | null) ||
      (document.querySelector('.matrix-scroll') as HTMLElement | null)
    const labels = document.querySelector('[data-testid="array-labels"]')
    const arraysFull = document.querySelector('.arrays-panel:not(.array-labels-strip)')
    const vis = (el: Element | null, clip: Element | null) => {
      if (!el || !clip) return 0
      const a = el.getBoundingClientRect()
      const c = clip.getBoundingClientRect()
      return Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
    }
    return {
      primaryScene: stage?.getAttribute('data-primary-scene'),
      stageH: stage ? Math.round(stage.getBoundingClientRect().height) : 0,
      matrixInStage: Math.round(vis(matrix, stage)),
      currentCellVisibleH: Math.round(vis(current, stage)),
      currentCell: current?.getAttribute('data-cell'),
      hasLabels: !!labels,
      hasFullArrays: !!arraysFull,
      labelsH: labels ? Math.round(labels.getBoundingClientRect().height) : 0,
      matrixH: matrix ? Math.round(matrix.getBoundingClientRect().height) : 0,
    }
  })
}

async function measureCompactClip(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="input-panel"]') as HTMLElement | null
    const run = document.querySelector('[data-testid="run-btn"]') as HTMLElement | null
    const edit = document.querySelector('[data-testid="input-edit-toggle"]') as HTMLElement | null
    const clip = (el: HTMLElement | null, box: HTMLElement | null) => {
      if (!el || !box) return null
      const a = el.getBoundingClientRect()
      const c = box.getBoundingClientRect()
      const w = Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left))
      const h = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
      const area = a.width * a.height
      return { frac: area > 0 ? w * h / area : 0, ah: Math.round(a.height), panelH: Math.round(c.height) }
    }
    return {
      panelH: panel ? Math.round(panel.getBoundingClientRect().height) : 0,
      panelMaxH: panel ? getComputedStyle(panel).maxHeight : null,
      panelOverflow: panel ? getComputedStyle(panel).overflow : null,
      runClip: clip(run, panel),
      editClip: clip(edit, panel),
    }
  })
}

test.describe('V18 data-body / primary-scene / controls / acceptance', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  test('V18-01 sheet body height @1366 and @1920', async ({ page }) => {
    test.setTimeout(120_000)
    const results: Record<string, unknown> = {}
    for (const vp of [
      // V23 replacement: at 1366 the data region is content-calibrated (the brief's
      // target: default 3-node state visible WITHOUT scrolling while the graph keeps
      // ≥300px) instead of a fixed 280px body; wide 1920 keeps the ≥480 column.
      { w: 1366, h: 768, minBody: 96, noScroll: true },
      { w: 1920, h: 1080, minBody: 480, noScroll: true },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareDijkstraN3Ready(page)
      await openDataSheet(page)
      await expect(page.getByTestId('workbench-layout')).toHaveAttribute('data-data-visible', '1')
      await page.waitForTimeout(300)
      const m = await measureSheetBody(page)
      expect(m.sheetBodyMaxH === 'none' || m.sheetBodyMaxH === '' || !m.sheetBodyMaxH).toBeTruthy()
      expect(m.sheetBodyH, JSON.stringify(m)).toBeGreaterThanOrEqual(vp.minBody)
      expect(m.rowsVisible, JSON.stringify(m)).toBeGreaterThanOrEqual(2)
      expect(Number.parseFloat(String(m.sheetBodyCssH ?? '0'))).not.toBe(96)
      if (vp.noScroll) expect(m.sheetScrollH, JSON.stringify(m)).toBeLessThanOrEqual(m.sheetClientH + 1)
      const plotH = await page.evaluate(() => document.querySelector('[data-testid="graph-plot"]')?.getBoundingClientRect().height ?? 0)
      expect(plotH, 'graph drawing height with data open').toBeGreaterThanOrEqual(300)
      results[`${vp.w}x${vp.h}`] = m
      await page.screenshot({ path: path.join(OUT_SHOTS, `v18-01-sheet-body-${vp.w}.png`) })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v18-01-sheet-body.json'), JSON.stringify(results, null, 2))
  })

  test('V18-02 LCS DP matrix primary in stage; current cell visible', async ({ page }) => {
    test.setTimeout(120_000)
    const results: Record<string, unknown> = {}
    for (const vp of [
      { w: 1366, h: 768 },
      { w: 1920, h: 1080 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('#/algo/lcs')
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
      await ensureInputEditing(page)
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 2 })
      for (let i = 0; i < 12; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      await page.waitForTimeout(250)
      const m = await measureLcsScene(page)
      expect(m.primaryScene, JSON.stringify(m)).toBe('matrix')
      expect(m.hasFullArrays, 'X/Y must not be full primary cards').toBe(false)
      expect(m.hasLabels, JSON.stringify(m)).toBe(true)
      expect(m.matrixInStage, JSON.stringify(m)).toBeGreaterThan(80)
      expect(m.currentCellVisibleH, JSON.stringify(m)).toBeGreaterThan(20)
      // Not just a maxHeight string — real content intersection
      expect(m.currentCell).toBeTruthy()
      results[`${vp.w}x${vp.h}`] = m
      await page.screenshot({ path: path.join(OUT_SHOTS, `v18-02-lcs-primary-${vp.w}.png`) })
    }
    // mergeSort: main array preferred (primary-first), buffers compact
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/mergeSort')
    await ensureInputEditing(page)
    const arr = page.getByTestId('array-input')
    if (await arr.count()) {
      await arr.fill('5,2,4,1')
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 2 })
      for (let i = 0; i < 20; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      const order = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="arrays-panel"]')
        return {
          order: panel?.getAttribute('data-array-order'),
          primaryScene: document.querySelector('[data-testid="viz-canvas"]')?.getAttribute('data-primary-scene'),
          compactBuffers: document.querySelectorAll('[data-testid="array-buffers"] .array-view[data-compact="1"]').length,
        }
      })
      expect(order.primaryScene).toBe('array')
      expect(order.order).toBe('primary-first')
      results.mergeSort = order
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v18-02-primary-scene.json'), JSON.stringify(results, null, 2))
  })

  test('V18-03 data open: edit/run/theory hittable; compact clip; real click edit @1920', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    // Compact controls @1366 before any focus/scroll
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/kadane')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    // Idle collapsed — do NOT auto-scroll into view before measuring clip
    const compact = await measureCompactClip(page)
    expect(compact.panelOverflow === 'visible' || compact.panelMaxH === 'none').toBeTruthy()
    expect(compact.runClip?.frac ?? 0, JSON.stringify(compact)).toBeGreaterThanOrEqual(0.95)
    expect(compact.editClip?.frac ?? 0, JSON.stringify(compact)).toBeGreaterThanOrEqual(0.95)

    await page.setViewportSize({ width: 1920, height: 1080 })
    await prepareDijkstraN3Ready(page)
    // collapse to summary+actions then open data
    const edit = page.getByTestId('input-edit-toggle')
    if ((await page.getByTestId('input-panel').getAttribute('data-editing')) === '1') {
      await edit.click()
      await expect(page.getByTestId('input-panel')).toHaveAttribute('data-editing', '0')
    }
    await openDataSheet(page)
    await page.waitForTimeout(300)
    const sheet = await measureSheetBody(page)
    expect(sheet.algoDataOpen).toBe('1')
    // V23 replacement of "header/input right edge ≤ fixed sheet left": the data region
    // is a grid sibling, so the contract is zero intersection area.
    expect(sheet.headerOverlapData, JSON.stringify(sheet)).toBe(0)
    expect(sheet.inputOverlapData, JSON.stringify(sheet)).toBe(0)

    const editHit = await realHit(page, '[data-testid="input-edit-toggle"]')
    const runHit = await realHit(page, '[data-testid="run-btn"]')
    const theoryHit = await realHit(page, '.theory-toggle')
    expect(editHit.ok, JSON.stringify(editHit)).toBe(true)
    expect(runHit.ok, JSON.stringify(runHit)).toBe(true)
    expect(theoryHit.ok, JSON.stringify(theoryHit)).toBe(true)

    // Real click edit with data open @1920 — no force
    await edit.click({ timeout: 5_000 })
    await expect(page.getByTestId('input-panel')).toHaveAttribute('data-editing', '1')

    const payload = { compact, sheet, editHit, runHit, theoryHit, editClickOk: true }
    fs.writeFileSync(path.join(OUT_TRACES, 'v18-03-controls-data-open.json'), JSON.stringify(payload, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v18-03-1920-data-open-edit.png') })
  })

  test('V18-04 mutation sanity must fail; no force/viewport swap; retries=0', async ({ page }) => {
    test.setTimeout(120_000)
    test.info().annotations.push({ type: 'retries', description: '0' })
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraN3Ready(page)
    await openDataSheet(page)
    await page.waitForTimeout(200)

    const mutationSanity = await page.evaluate(() => {
      const faults: Record<string, boolean> = {}
      const body = document.querySelector('[data-testid="workbench-data-body"]') as HTMLElement | null
      const edit = document.querySelector('[data-testid="input-edit-toggle"]') as HTMLElement | null
      const code = document.querySelector('[data-testid="workbench-code-slot"]') as HTMLElement | null
      const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null

      const hit = (el: HTMLElement | null) => {
        if (!el) return false
        const b = el.getBoundingClientRect()
        if (b.width < 2 || b.height < 2) return false
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        return !!(top && (top === el || el.contains(top)))
      }

      // 1) force 96px body (with !important to beat stylesheet) — assertion surface must detect failure
      if (body) {
        body.style.setProperty('height', '96px', 'important')
        body.style.setProperty('max-height', '96px', 'important')
        body.style.setProperty('min-height', '96px', 'important')
        body.style.setProperty('flex', '0 0 96px', 'important')
        body.style.setProperty('overflow', 'hidden', 'important')
        const h = body.getBoundingClientRect().height
        faults.force96BodyDetected = h <= 100
        body.style.removeProperty('height')
        body.style.removeProperty('max-height')
        body.style.removeProperty('min-height')
        body.style.removeProperty('flex')
        body.style.removeProperty('overflow')
      }

      // 2) cover edit with absolute blocker
      const blocker = document.createElement('div')
      blocker.setAttribute('data-testid', 'v18-mutation-blocker')
      Object.assign(blocker.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        right: '0',
        bottom: '0',
        zIndex: '9999',
        background: 'rgba(0,0,0,0.01)',
      })
      document.body.appendChild(blocker)
      faults.coverEditDetected = edit ? !hit(edit) : true
      blocker.remove()

      // 3) code.w=0
      if (code) {
        code.style.width = '0px'
        code.style.minWidth = '0px'
        code.style.overflow = 'hidden'
        faults.zeroCodeDetected = code.getBoundingClientRect().width < 40
        code.style.width = ''
        code.style.minWidth = ''
        code.style.overflow = ''
      }

      // 4) DP off-stage (simulate by translating matrices out)
      const mats = document.querySelector('.matrices-panel') as HTMLElement | null
      if (mats && stage) {
        mats.style.transform = 'translateY(4000px)'
        const cell = document.querySelector('.matrix-table td') as HTMLElement | null
        const vis = (el: Element | null, clip: Element | null) => {
          if (!el || !clip) return 0
          const a = el.getBoundingClientRect()
          const c = clip.getBoundingClientRect()
          return Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
        }
        faults.dpOffStageDetected = vis(cell, stage) < 2
        mats.style.transform = ''
      } else {
        // On Dijkstra there is no matrix — mark N/A as vacuously checked via LCS path below
        faults.dpOffStageDetected = true
      }

      return faults
    })

    expect(mutationSanity.force96BodyDetected, JSON.stringify(mutationSanity)).toBe(true)
    expect(mutationSanity.coverEditDetected, JSON.stringify(mutationSanity)).toBe(true)
    expect(mutationSanity.zeroCodeDetected, JSON.stringify(mutationSanity)).toBe(true)

    // LCS DP off-stage fault
    await page.goto('#/algo/lcs')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 2 })
    const dpFault = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
      const mats = document.querySelector('.matrices-panel') as HTMLElement | null
      if (!mats || !stage) return { ok: false }
      mats.style.transform = 'translateY(4000px)'
      const cell = document.querySelector('.matrix-table td.hl-focus, .matrix-table td') as HTMLElement | null
      const a = cell?.getBoundingClientRect()
      const c = stage.getBoundingClientRect()
      const vis = a ? Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)) : 0
      mats.style.transform = ''
      return { ok: true, vis, detected: vis < 2 }
    })
    expect(dpFault.detected, JSON.stringify(dpFault)).toBe(true)

    // openDataSheet path: no force / no 390 swap in this test
    const openSrc = fs.readFileSync(
      path.join(process.cwd(), 'tests/e2e/helpers/runReadiness.ts'),
      'utf8',
    )
    // Comment may mention force:true; the openDataSheet implementation must not call it
    expect(openSrc).toMatch(/without force:true or secret viewport swap/)
    expect(openSrc).not.toMatch(/\.click\(\{[^}]*force:\s*true/)
    expect(openSrc).not.toMatch(/setViewportSize\(\{\s*width:\s*390/)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v18-04-mutation-sanity.json'),
      JSON.stringify({ mutationSanity, dpFault }, null, 2),
    )
  })
})
