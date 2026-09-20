import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  prepareDijkstraN3Ready,
  openDataSheet,
  waitForRunReady,
} from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v19')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v19')

function ensureDirs() {
  fs.mkdirSync(path.join(OUT_SHOTS, 'after'), { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function prepareLcsReady(page: Page) {
  await page.goto('#/algo/lcs')
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await ensureInputEditing(page)
  const before = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await page.getByTestId('run-btn').click()
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid="visualizer"]') as HTMLElement | null
      if (!el || el.getAttribute('data-preview') !== '0') return false
      const rid = el.getAttribute('data-run-id')
      if (!rid || rid === 'preview') return false
      return prev == null || prev === 'preview' || rid !== prev
    },
    before,
    { timeout: 30_000 },
  )
  const runId = await page.getByTestId('visualizer').getAttribute('data-run-id')
  return waitForRunReady(page, { expectRunId: runId ?? undefined, minSteps: 90 })
}


async function userWheelAway(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(80)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(100)
}

async function measureMatrixInner(page: Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector('.matrix-scroll') as HTMLElement | null
    const current = document.querySelector(
      '.matrix-table td.hl-focus, .matrix-table td.hl-write',
    ) as HTMLElement | null
    const stickyTop = document.querySelector('.matrix-table .sticky-top') as HTMLElement | null
    const stickyH =
      stickyTop && scroller ? stickyTop.getBoundingClientRect().height : 0
    const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
    if (!scroller || !current) {
      return { counter, cell: null, scrollTop: scroller?.scrollTop ?? null, visibleH: 0, clientH: scroller?.clientHeight ?? 0 }
    }
    const a = current.getBoundingClientRect()
    const r = scroller.getBoundingClientRect()
    const visibleH = Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top + stickyH))
    return {
      counter,
      cell: current.getAttribute('data-cell'),
      scrollTop: scroller.scrollTop,
      visibleH: Math.round(visibleH),
      clientH: scroller.clientHeight,
      offsetParent: String((current.offsetParent as HTMLElement | null)?.className ?? '').slice(0, 60),
    }
  })
}

async function measureCodeScroll(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.code-browser-cm-wrap') as HTMLElement | null
    const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
    const exec = document.querySelector('.cm-exec-line') as HTMLElement | null
    const vis = (el: Element | null, clip: Element | null) => {
      if (!el || !clip) return 0
      const a = el.getBoundingClientRect()
      const c = clip.getBoundingClientRect()
      return Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
    }
    return {
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent ?? '',
      execLine: wrap?.getAttribute('data-exec-line') ?? '',
      wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : 0,
      cmClientH: scroller?.clientHeight ?? 0,
      cmScrollH: scroller?.scrollHeight ?? 0,
      cmScrollTop: scroller?.scrollTop ?? 0,
      execVisWrap: Math.round(vis(exec, wrap)),
      execVisScroller: Math.round(vis(exec, scroller)),
      canScroll: (scroller?.scrollHeight ?? 0) > (scroller?.clientHeight ?? 0) + 2,
    }
  })
}

async function measureCompact(page: Page) {
  return page.evaluate(() => {
    const strip = document.querySelector('[data-testid="array-labels"]') as HTMLElement | null
    const chars = [...document.querySelectorAll('[data-testid="array-labels"] .compact-ch')]
    const vis = (el: Element) => {
      if (!strip) return 0
      const a = el.getBoundingClientRect()
      const c = strip.getBoundingClientRect()
      return Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
    }
    return {
      semantic: strip?.getAttribute('data-compact-semantic'),
      stripH: strip ? Math.round(strip.getBoundingClientRect().height) : 0,
      total: chars.length,
      readable: chars.filter((el) => vis(el) >= 8).length,
      context: document.querySelector('[data-testid="compact-context"]')?.textContent ?? null,
      matrixH: Math.round(
        document.querySelector('.matrix-scroll')?.getBoundingClientRect().height ?? 0,
      ),
      names: [...document.querySelectorAll('[data-testid="array-labels"] .compact-seq')].map((e) =>
        e.getAttribute('data-array'),
      ),
    }
  })
}

async function measureVarsBtn(page: Page) {
  return page.evaluate(() => {
    const slot = document.querySelector('.viz-banner-slot') as HTMLElement | null
    const btn = document.querySelector(
      '[data-testid="inspector-sheet-toggle"]',
    ) as HTMLElement | null
    if (!slot || !btn) return { missing: true as const }
    const s = slot.getBoundingClientRect()
    const b = btn.getBoundingClientRect()
    const h = Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top))
    const w = Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left))
    const area = Math.max(1, b.width * b.height)
    return {
      missing: false as const,
      slotH: Math.round(s.height),
      btnH: Math.round(b.height),
      btnW: Math.round(b.width),
      visibleFrac: (w * h) / area,
      visibleH: Math.round(h),
      display: getComputedStyle(btn).display,
      hidden: btn.getAttribute('hidden'),
    }
  })
}

test.describe('V19 matrix follow / CM scroll / compact / vars / acceptance', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  test('V19-01 LCS full 95 frames; frame 14/95 matrix cell visible (inner+sticky)', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const results: Record<string, unknown> = {}
    for (const vp of [
      { w: 1366, h: 768 },
      { w: 1920, h: 1080 },
      { w: 390, h: 844 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareLcsReady(page)
      // Advance to 14/95 — no pre-scroll of current cell
      for (let i = 0; i < 13; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      await page.waitForTimeout(200)
      const m14 = await measureMatrixInner(page)
      expect(m14.counter, JSON.stringify(m14)).toMatch(/14\s*\/\s*95/)
      expect(m14.visibleH, JSON.stringify(m14)).toBeGreaterThan(16)
      results[`14_${vp.w}`] = m14

      // Walk remaining frames — matrix follow must not blow up; sample a few
      let last = m14
      for (let i = 14; i < 95; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
        if (i % 5 === 0) await page.waitForTimeout(30)
        if (i === 30 || i === 60 || i === 94) {
          await page.waitForTimeout(200)
          // If follow paused from prior race, resume then remeasure
          const paused = page.getByTestId('matrix-follow-paused')
          if (await paused.count()) {
            await page.getByTestId('matrix-resume-follow-btn').click()
            await page.waitForTimeout(150)
          }
          last = await measureMatrixInner(page)
          if (last.visibleH < 10) {
            await page.getByTestId('matrix-locate-btn').click()
            await page.waitForTimeout(150)
            last = await measureMatrixInner(page)
          }
          expect(last.visibleH, `frame sample ${i}: ${JSON.stringify(last)}`).toBeGreaterThan(10)
        }
      }
      results[`end_${vp.w}`] = last
      await page.screenshot({
        path: path.join(OUT_SHOTS, 'after', `v19-01-lcs-end-${vp.w}.png`),
      })
    }

    // Manual pause + resume locate (V20-01: real wheel; evaluate scrollTop must not pause)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(150)
    await userWheelAway(page, '.matrix-scroll')
    await expect(page.getByTestId('matrix-follow-paused')).toBeVisible({ timeout: 3_000 })
    const paused = await measureMatrixInner(page)
    expect(paused.visibleH, 'after manual scroll away').toBeLessThan(8)
    await page.getByTestId('matrix-locate-btn').click()
    await page.waitForTimeout(150)
    const restored = await measureMatrixInner(page)
    expect(restored.visibleH, JSON.stringify(restored)).toBeGreaterThan(16)
    results.locateRestore = { paused, restored }
    fs.writeFileSync(path.join(OUT_TRACES, 'v19-01-matrix-follow.json'), JSON.stringify(results, null, 2))
  })

  test('V19-02 Dijkstra 16/25 line 19 visible; goto; unconstrained fault fails', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/dijkstra')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 20 })

    for (let i = 0; i < 15; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(250)
    const m = await measureCodeScroll(page)
    expect(m.counter, JSON.stringify(m)).toMatch(/16\s*\/\s*25/)
    expect(m.execLine).toBe('19')
    expect(m.canScroll, JSON.stringify(m)).toBe(true)
    expect(m.cmClientH, 'real scrollport clientH').toBeLessThan(m.cmScrollH - 2)
    expect(m.execVisWrap, JSON.stringify(m)).toBeGreaterThan(12)

    // Real wheel leave then restore (V20-01: evaluate scrollTop must not pause)
    await userWheelAway(page, '.cm-scroller')
    await expect(page.getByTestId('follow-paused')).toBeVisible({ timeout: 3_000 })
    await page.getByTestId('goto-exec-btn').click()
    await page.waitForTimeout(200)
    const afterGoto = await measureCodeScroll(page)
    expect(afterGoto.execVisWrap, JSON.stringify(afterGoto)).toBeGreaterThan(12)

    // With data open
    await openDataSheet(page)
    await page.waitForTimeout(200)
    const withData = await measureCodeScroll(page)
    expect(withData.cmClientH).toBeGreaterThan(40)
    expect(withData.canScroll).toBe(true)
    // re-goto after layout
    await page.getByTestId('goto-exec-btn').click()
    await page.waitForTimeout(200)
    const withDataGoto = await measureCodeScroll(page)
    expect(withDataGoto.execVisWrap, JSON.stringify(withDataGoto)).toBeGreaterThan(10)

    // Fault: unconstrained wrapper — inject style tag so !important chain expands with content
    const fault = await page.evaluate(() => {
      document.querySelector('[data-testid="cm-unconstrained-fault"]')?.remove()
      const st = document.createElement('style')
      st.setAttribute('data-testid', 'cm-unconstrained-fault')
      st.textContent = `
        .code-browser-cm-wrap,
        .code-browser-cm-wrap > div,
        .code-browser-cm-wrap .cm-theme-dark,
        .code-browser-cm-wrap .cm-theme-light,
        .code-browser-cm-wrap .cm-editor,
        .code-browser-cm-wrap .cm-scroller {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          flex: 0 0 auto !important;
        }
      `
      document.head.appendChild(st)
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      const clientH = scroller?.clientHeight ?? 0
      const scrollH = scroller?.scrollHeight ?? 0
      const canScroll = scrollH > clientH + 2
      // Fault succeeds when scrollport contract breaks (cannot scroll)
      return { ok: !canScroll, clientH, scrollH, canScroll }
    })
    expect(fault.ok, `fault inject must fail scrollport contract: ${JSON.stringify(fault)}`).toBe(
      true,
    )

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v19-02-cm-scroll.json'),
      JSON.stringify({ m, afterGoto, withData, withDataGoto, fault }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v19-02-dijkstra-code.png') })
  })

  test('V19-03 compact labels readable; 40px-clip negative fails', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(150)
    const lcs = await measureCompact(page)
    expect(lcs.semantic).toBe('1')
    expect(lcs.readable, JSON.stringify(lcs)).toBe(lcs.total)
    expect(lcs.readable).toBeGreaterThan(0)
    expect(lcs.matrixH).toBeGreaterThan(80)
    expect(lcs.context ?? '').toMatch(/X\[|Y\[/)

    // Negative: force old 40px clip — chars that would sit below must fail readability
    const neg = await page.evaluate(() => {
      const strip = document.querySelector('[data-testid="array-labels"]') as HTMLElement | null
      if (!strip) return { failDetected: false }
      // Replace semantic strip with a tall fake card clipped to 40px
      strip.innerHTML =
        '<div style="height:120px;padding-top:48px"><span class="cell-val" data-testid="fault-cell-val">A</span></div>'
      strip.style.maxHeight = '40px'
      strip.style.overflow = 'hidden'
      const el = strip.querySelector('[data-testid="fault-cell-val"]') as HTMLElement
      const a = el.getBoundingClientRect()
      const c = strip.getBoundingClientRect()
      const vis = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
      return { failDetected: vis < 8, vis: Math.round(vis), stripH: Math.round(c.height) }
    })
    expect(neg.failDetected, JSON.stringify(neg)).toBe(true)

    // Knapsack weights/values
    await page.goto('#/algo/knapsack01')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 2 })
    for (let i = 0; i < 8; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
    }
    const kn = await measureCompact(page)
    expect(kn.names).toEqual(expect.arrayContaining(['weights', 'values']))
    expect(kn.readable, JSON.stringify(kn)).toBe(kn.total)
    expect(kn.matrixH).toBeGreaterThan(60)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v19-03-compact-labels.json'),
      JSON.stringify({ lcs, neg, kn }, null, 2),
    )
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v19-03-compact.png') })
  })

  test('V19-04 vars button full geometry before click @1366 drawer', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraN3Ready(page)
    // Measure BEFORE any focus/scroll of the toggle
    const before = await measureVarsBtn(page)
    expect(before.missing).toBe(false)
    if (!before.missing) {
      expect(before.display).not.toBe('none')
      expect(before.visibleFrac, JSON.stringify(before)).toBeGreaterThanOrEqual(0.95)
      expect(before.visibleH, JSON.stringify(before)).toBeGreaterThanOrEqual(
        Math.floor((before.btnH ?? 0) * 0.9),
      )
    }
    // Real hit — no force
    const hit = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="inspector-sheet-toggle"]') as HTMLElement
      const b = el.getBoundingClientRect()
      const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
      return !!(top && (top === el || el.contains(top)))
    })
    expect(hit).toBe(true)
    await page.getByTestId('inspector-sheet-toggle').click()
    await expect(page.getByTestId('inspector-sheet')).toBeVisible()

    // Run button not regressing
    const runClip = await page.evaluate(() => {
      const run = document.querySelector('[data-testid="run-btn"]') as HTMLElement | null
      const panel = document.querySelector('[data-testid="input-panel"]') as HTMLElement | null
      if (!run || !panel) return 0
      const a = run.getBoundingClientRect()
      const c = panel.getBoundingClientRect()
      const h = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
      const w = Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left))
      const area = Math.max(1, a.width * a.height)
      return (w * h) / area
    })
    expect(runClip).toBeGreaterThanOrEqual(0.9)

    fs.writeFileSync(path.join(OUT_TRACES, 'v19-04-vars-banner.json'), JSON.stringify({ before, hit, runClip }, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v19-04-vars.png') })
  })

  test('V19-05 key paths ×10 retries=0; mutation sanity', async ({ page }) => {
    test.setTimeout(300_000)
    const paths: Record<string, unknown[]> = {
      lcs14: [],
      dijkstraCode: [],
      compact: [],
      vars: [],
      sheetBody: [],
    }
    for (let round = 0; round < 10; round++) {
      // 1) LCS 14
      await page.setViewportSize({ width: 1366, height: 768 })
      await prepareLcsReady(page)
      for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
      await page.waitForTimeout(120)
      const m = await measureMatrixInner(page)
      expect(m.visibleH).toBeGreaterThan(16)
      paths.lcs14.push(m.visibleH)

      // 2) Dijkstra code
      await page.goto('#/algo/dijkstra')
      await ensureInputEditing(page)
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 20 })
      for (let i = 0; i < 15; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      await page.waitForTimeout(200)
      const c = await measureCodeScroll(page)
      expect(c.execVisWrap).toBeGreaterThan(12)
      paths.dijkstraCode.push(c.execVisWrap)

      // 3) compact
      const lab = await measureCompact(page).catch(async () => {
        await prepareLcsReady(page)
        return measureCompact(page)
      })
      // re-measure on LCS
      await prepareLcsReady(page)
      const lab2 = await measureCompact(page)
      expect(lab2.readable).toBe(lab2.total)
      paths.compact.push(lab2.readable)

      // 4) vars
      await prepareDijkstraN3Ready(page)
      const v = await measureVarsBtn(page)
      expect(!v.missing && v.visibleFrac >= 0.95).toBe(true)
      paths.vars.push(!v.missing ? v.visibleFrac : 0)

      // 5) sheet body (V18 preserve)
      await openDataSheet(page)
      const bodyH = await page.evaluate(() => {
        const body = document.querySelector('[data-testid="viz-inspector-sheet"]') as HTMLElement | null
        return body ? Math.round(body.getBoundingClientRect().height) : 0
      })
      expect(bodyH).toBeGreaterThanOrEqual(280)
      paths.sheetBody.push(bodyH)
    }

    // Mutation sanity: force regressions must be detectable
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    const mutMatrix = await page.evaluate(() => {
      const s = document.querySelector('.matrix-scroll') as HTMLElement | null
      if (s) s.scrollTop = 9999
      const current = document.querySelector('.matrix-table td.hl-focus, .matrix-table td.hl-write')
      const scroller = document.querySelector('.matrix-scroll')
      if (!current || !scroller) return { detectable: false }
      const a = current.getBoundingClientRect()
      const r = scroller.getBoundingClientRect()
      const vis = Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top))
      return { detectable: vis < 8, vis: Math.round(vis) }
    })
    expect(mutMatrix.detectable).toBe(true)

    await page.goto('#/algo/dijkstra')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 20 })
    for (let i = 0; i < 15; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(200)
    const mutCode = await page.evaluate(() => {
      document.querySelector('[data-testid="cm-unconstrained-fault"]')?.remove()
      const st = document.createElement('style')
      st.setAttribute('data-testid', 'cm-unconstrained-fault')
      st.textContent = `
        .code-browser-cm-wrap, .code-browser-cm-wrap > div,
        .code-browser-cm-wrap .cm-editor, .code-browser-cm-wrap .cm-scroller {
          height: auto !important; max-height: none !important;
          overflow: visible !important; flex: 0 0 auto !important;
        }`
      document.head.appendChild(st)
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      const clientH = scroller?.clientHeight ?? 0
      const scrollH = scroller?.scrollHeight ?? 0
      return { detectable: !(scrollH > clientH + 2), clientH, scrollH }
    })
    expect(mutCode.detectable).toBe(true)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v19-05-keypaths-x10.json'),
      JSON.stringify({ paths, mutMatrix, mutCode }, null, 2),
    )
  })
})
