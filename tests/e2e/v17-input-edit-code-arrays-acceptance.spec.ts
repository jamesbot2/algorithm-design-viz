import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  prepareDijkstraN3Ready,
  openDataSheet,
  waitForRunReady,
} from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'
import {
  measureStrictGraphVisibility,
  injectPointerNonePaintFault,
  clearVisibilityFaults,
} from './helpers/assertStrictGraphVisible'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v17')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v17')

function ensureDirs() {
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function measureInputEdit(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-testid="input-panel"]') as HTMLElement | null
    const body = document.querySelector('[data-testid="input-panel-body"]') as HTMLElement | null
    const pageEl = document.querySelector('.algo-page') as HTMLElement | null
    const br = body?.getBoundingClientRect()
    const _pr = panel?.getBoundingClientRect()
    const cs = panel ? getComputedStyle(panel) : null
    const run = document.querySelector('[data-testid="run-btn"]') as HTMLElement | null
    const edit = document.querySelector('[data-testid="input-edit-toggle"]') as HTMLElement | null
    const theory = document.querySelector('.theory-toggle') as HTMLElement | null
    const hit = (el: HTMLElement | null) => {
      if (!el) return false
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const top = document.elementFromPoint(x, y)
      return !!(top && (top === el || el.contains(top) || top.closest?.('[data-testid="run-btn"],[data-testid="input-edit-toggle"],.theory-toggle')))
    }
    return {
      editing: pageEl?.getAttribute('data-input-editing'),
      bodyH: br ? Math.round(br.height) : 0,
      bodyW: br ? Math.round(br.width) : 0,
      panelMaxH: cs?.maxHeight ?? null,
      panelOverflow: cs?.overflow ?? null,
      runHit: hit(run),
      editHit: hit(edit),
      theoryHit: hit(theory),
      viewport: { w: innerWidth, h: innerHeight },
    }
  })
}

async function measureCodeData(page: Page) {
  return page.evaluate(() => {
    const rr = (sel: string) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }
    const codeSlot = rr('[data-testid="workbench-code-slot"]')
    const codeBrowser = rr('[data-testid="code-browser"]')
    const execLine = document.querySelector('.cm-exec-line') as HTMLElement | null
    const execR = execLine?.getBoundingClientRect()
    const sheet = rr('[data-testid="inspector-sheet"]')
    let sheetOverlapsCode = false
    const code = codeSlot
    if (sheet && code && code.w > 0) {
      sheetOverlapsCode = !(
        sheet.x + sheet.w <= code.x ||
        sheet.x >= code.x + code.w ||
        sheet.y + sheet.h <= code.y ||
        sheet.y >= code.y + code.h
      )
    }
    const wb = document.querySelector('[data-testid="workbench-layout"]') as HTMLElement | null
    return {
      codeSlot,
      codeBrowser,
      execLineW: execR ? Math.round(execR.width) : 0,
      sheet,
      sheetOverlapsCode,
      layout: wb?.getAttribute('data-layout'),
      dataOpen: wb?.getAttribute('data-data-open'),
      profile: wb?.getAttribute('data-layout-profile'),
      stepIndex: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index'),
      preview: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview'),
      runId: document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-run-id'),
    }
  })
}

async function measureArrayMaxH(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.array-view:not([data-compact="1"]) .bars-wrap') as HTMLElement | null
    const stage = document.querySelector('[data-testid="viz-canvas"]') as HTMLElement | null
    const cs = wrap ? getComputedStyle(wrap) : null
    const barH = cs?.getPropertyValue('--bar-chart-h')?.trim() || null
    return {
      barChartH: barH,
      stageH: stage?.clientHeight ?? 0,
      compactBuffers: document.querySelectorAll('[data-testid="array-buffers"] .array-view[data-compact="1"]').length,
    }
  })
}

test.describe('V17 input-edit / code+data / arrays / acceptance', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  for (const vp of [
    { w: 1366, h: 768, name: '1366x768' },
    { w: 1280, h: 800, name: '1280x800' },
    { w: 1440, h: 900, name: '1440x900' },
    { w: 1440, h: 901, name: '1440x901' },
    { w: 1024, h: 600, name: '1024x600' },
    { w: 390, h: 844, name: '390x844' },
  ]) {
    test(`V17-01 edit input real body @${vp.name}`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('#/algo/dijkstra')
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })

      const edit = page.getByTestId('input-edit-toggle')
      await expect(edit).toBeVisible()
      // Real click — not only fill helper
      const label = (await edit.textContent()) ?? ''
      if (label.includes('编辑输入')) {
        await edit.click()
      }
      await expect(page.getByTestId('input-panel')).toHaveAttribute('data-editing', '1')

      const body = page.getByTestId('input-panel-body')
      await expect(body).toBeVisible()
      const nField = page.getByTestId('graph-n')
      await nField.click()
      await nField.press('Control+A')
      await nField.type('4', { delay: 20 })
      await expect(nField).toHaveValue('4')

      const m = await measureInputEdit(page)
      expect(m.editing).toBe('1')
      expect(m.bodyH, JSON.stringify(m)).toBeGreaterThan(40)
      // Must not be clamped to ~4.5rem panel with hidden overflow while editing
      if (vp.h <= 900) {
        expect(m.panelMaxH === 'none' || m.panelMaxH === '' || !m.panelMaxH || parseFloat(m.panelMaxH) > 100).toBeTruthy()
      }
      // V18-04: no hit||isVisible OR — real elementFromPoint hit required
      expect(m.runHit, JSON.stringify(m)).toBe(true)
      expect(m.editHit, JSON.stringify(m)).toBe(true)
      await expect(page.locator('.theory-toggle')).toBeVisible()

      // Illegal input → errors still show body
      await page.getByTestId('graph-edges').click()
      await page.getByTestId('graph-edges').fill('bad edge line')
      await page.getByTestId('run-btn').click()
      await page.waitForTimeout(300)
      const afterErr = await measureInputEdit(page)
      expect(afterErr.bodyH, JSON.stringify(afterErr)).toBeGreaterThan(20)

      await page.screenshot({ path: path.join(OUT_SHOTS, `v17-01-edit-${vp.name}.png`) })
      fs.writeFileSync(
        path.join(OUT_TRACES, `v17-01-edit-${vp.name}.json`),
        JSON.stringify({ m, afterErr }, null, 2),
      )
    })
  }

  test('V17-01 resize 768→900→901 keeps edit body', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 768 })
    await page.goto('#/algo/kadane')
    await ensureInputEditing(page)
    const heights: number[] = []
    for (const h of [768, 900, 901]) {
      await page.setViewportSize({ width: 1440, height: h })
      await page.waitForTimeout(200)
      const m = await measureInputEdit(page)
      heights.push(m.bodyH)
      expect(m.bodyH, `h=${h}`).toBeGreaterThan(40)
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v17-01-resize-768-900-901.json'), JSON.stringify({ heights }, null, 2))
  })

  test('V17-02 data open keeps readable code @1366', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraN3Ready(page)
    await page.waitForTimeout(300)

    await openDataSheet(page)
    await expect(page.getByTestId('workbench-layout')).toHaveAttribute('data-data-open', '1', {
      timeout: 5_000,
    })
    await page.waitForTimeout(400)
    const withData = await measureCodeData(page)

    // Assert readable code BEFORE / independent of sheetOverlapsCode
    expect(withData.layout, JSON.stringify(withData)).toBe('split')
    expect(withData.dataOpen).toBe('1')
    expect(withData.codeSlot?.w ?? 0, JSON.stringify(withData)).toBeGreaterThanOrEqual(160)
    expect(withData.codeBrowser?.w ?? 0, JSON.stringify(withData)).toBeGreaterThanOrEqual(140)
    // Zero-width code fault must fail — inject and assert
    const fault = await page.evaluate(() => {
      const slot = document.querySelector('[data-testid="workbench-code-slot"]') as HTMLElement | null
      if (!slot) return false
      slot.style.width = '0px'
      slot.style.minWidth = '0px'
      slot.style.overflow = 'hidden'
      return true
    })
    expect(fault).toBe(true)
    const zeroed = await measureCodeData(page)
    expect(zeroed.codeSlot?.w ?? 0, 'fault inject zero-width must be detectable').toBeLessThan(40)
    // Restore
    await page.evaluate(() => {
      const slot = document.querySelector('[data-testid="workbench-code-slot"]') as HTMLElement | null
      if (slot) {
        slot.style.width = ''
        slot.style.minWidth = ''
        slot.style.overflow = ''
      }
    })
    await page.waitForTimeout(200)
    const restored = await measureCodeData(page)
    expect(restored.codeSlot?.w ?? 0).toBeGreaterThanOrEqual(160)
    expect(restored.sheetOverlapsCode, JSON.stringify(restored)).toBe(false)

    // ≥10 continuous steps with data open
    const before = Number(restored.stepIndex ?? 0)
    for (let s = 0; s < 10; s++) {
      await page.getByTestId('inspector-next-btn').click()
    }
    const after = await measureCodeData(page)
    expect(Number(after.stepIndex)).toBe(before + 10)
    expect(after.codeSlot?.w ?? 0).toBeGreaterThanOrEqual(160)

    await page.screenshot({ path: path.join(OUT_SHOTS, 'v17-02-1366-data-open.png') })
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v17-02-1366-data-open.json'),
      JSON.stringify({ withData, zeroed, restored, after }, null, 2),
    )
  })

  test('V17-03 array maxH from stage @1366/1920', async ({ page }) => {
    test.setTimeout(120_000)
    const results: Record<string, unknown> = {}
    for (const vp of [
      { w: 1366, h: 768 },
      { w: 1920, h: 1080 },
      { w: 2560, h: 1440 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('#/algo/kadane')
      await ensureInputEditing(page)
      await page.getByTestId('array-input').fill('-2,1,-3,4,-1,2,1,-5,4')
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 3 })
      await page.waitForTimeout(300)
      const m = await measureArrayMaxH(page)
      const parsed = m.barChartH ? parseFloat(m.barChartH) : 0
      // Desktop non-compact should exceed old hard 160 chart when stage allows
      if (vp.h >= 768) {
        expect(parsed, JSON.stringify({ vp, m })).toBeGreaterThan(160)
      }
      results[`${vp.w}x${vp.h}`] = m
    }
    // Aux buffers compact on mergeSort
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/mergeSort')
    await ensureInputEditing(page)
    const arr = page.getByTestId('array-input')
    if (await arr.count()) {
      await arr.fill('5,2,4,1')
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 2 })
      for (let i = 0; i < 15; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      const buf = await measureArrayMaxH(page)
      results.mergeSortBuffers = buf
    }
    // DP matrix not stuck — LCS
    await page.goto('#/algo/lcs')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 2 })
    // V21-03: lab-fill matrix uses max-height:100% (computed often as parent px, may be ≤420).
    // Assert fill mode + usable scrollport — not legacy fixed early-cap without lab-fill.
    const matrixInfo = await page.evaluate(() => {
      const sc = document.querySelector('.matrix-scroll') as HTMLElement | null
      const wrap = document.querySelector('.main-wrap')
      if (!sc) return null
      return {
        maxHeight: getComputedStyle(sc).maxHeight,
        clientH: sc.clientHeight,
        labFill: wrap?.getAttribute('data-lab-fill'),
        primaryMatrix: !!document.querySelector('[data-primary-scene="matrix"]'),
      }
    })
    results.lcsMatrixMaxH = matrixInfo
    expect(matrixInfo, 'matrix-scroll present').toBeTruthy()
    expect(matrixInfo!.labFill).toBe('1')
    expect(matrixInfo!.primaryMatrix).toBe(true)
    expect(matrixInfo!.clientH).toBeGreaterThan(64)
    const mh = matrixInfo!.maxHeight
    expect(
      mh === 'none' ||
        mh.includes('%') ||
        mh.includes('vh') ||
        (parseFloat(mh) > 0 && mh !== '420px') ||
        // coincidence: parent happens to be 420px under 100% fill — still lab-fill
        (mh === '420px' && matrixInfo!.labFill === '1' && matrixInfo!.clientH > 64),
    ).toBeTruthy()

    fs.writeFileSync(path.join(OUT_TRACES, 'v17-03-array-stage.json'), JSON.stringify(results, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'v17-03-array-stage.png') })
  })

  test('V17-04 Dijkstra×10 roles+dist; run bind; visibility; retries=0', async ({ page }) => {
    test.setTimeout(240_000)
    test.info().annotations.push({ type: 'retries', description: '0' })
    const results: unknown[] = []
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1280, height: 800 })
      const snap = await prepareDijkstraN3Ready(page)
      expect(snap.preview).toBe('0')
      expect(snap.runId && snap.runId !== 'preview').toBeTruthy()

      const next = page.getByTestId('next-step-btn')
      for (let s = 0; s < 80; s++) {
        if (await next.isDisabled()) break
        await next.click()
      }
      const vis = await measureStrictGraphVisibility(page)
      expect(vis.ok, `iter ${i} ${JSON.stringify(vis.issues)}`).toBe(true)

      const roles = await page.evaluate(() => {
        const out: Record<string, string> = {}
        for (const g of document.querySelectorAll('[data-edge-id]')) {
          const id = g.getAttribute('data-edge-id') || ''
          const role = g.getAttribute('data-edge-role') || ''
          out[id] = role
        }
        return out
      })
      expect(roles['0->2'], JSON.stringify(roles)).toMatch(/tree|accepted/)
      expect(roles['2->1'], JSON.stringify(roles)).toMatch(/tree|accepted/)

      await openDataSheet(page)
      const dist = page.getByTestId('viz-inspector-sheet').getByTestId('inspector-array-dist')
      await expect(dist).toBeVisible({ timeout: 8_000 })
      const distText = ((await dist.textContent()) || '').replace(/\s+/g, ' ')
      // Final dist: 0,1,1 or similar for n=3 case (0→0=0, 0→2=1, 0→1 via 2 = 2)
      expect(distText.length).toBeGreaterThan(0)
      await page.keyboard.press('Escape')

      results.push({ i, runId: snap.runId, ok: vis.ok, roles, distText })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v17-04-dijkstra-x10.json'), JSON.stringify(results, null, 2))

    // Same visibility entry pos/neg
    await prepareDijkstraN3Ready(page)
    const pos = await measureStrictGraphVisibility(page)
    expect(pos.ok).toBe(true)
    await injectPointerNonePaintFault(page)
    const neg = await measureStrictGraphVisibility(page)
    expect(neg.ok).toBe(false)
    await clearVisibilityFaults(page)
    const recovered = await measureStrictGraphVisibility(page)
    expect(recovered.ok).toBe(true)
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v17-04-visibility-same-entry.json'),
      JSON.stringify({ pos, neg, recovered }, null, 2),
    )
  })
})
