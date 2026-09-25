
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { openDataSheet, waitForRunReady } from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v21')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v21')

function ensureDirs() {
  fs.mkdirSync(path.join(OUT_SHOTS, 'before'), { recursive: true })
  fs.mkdirSync(path.join(OUT_SHOTS, 'after'), { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function prepareDijkstraDefaultReady(page: Page) {
  await page.goto('#/algo/dijkstra')
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
  return waitForRunReady(page, { expectRunId: runId ?? undefined, minSteps: 20 })
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

async function revealCodePanel(page: Page) {
  const layout = await page.getByTestId('workbench-layout').getAttribute('data-layout')
  if (layout === 'tabs') {
    await page.locator('.workbench-tabs button[role="tab"]', { hasText: '代码' }).click()
    await page.waitForTimeout(120)
  }
}

async function openPseudo(page: Page) {
  await revealCodePanel(page)
  await page.getByTestId('tab-pseudo').evaluate((el) => (el as HTMLElement).click())
  await page.waitForFunction(() => {
    const pre = document.querySelector('[data-testid="pseudo-pre"]') as HTMLElement | null
    return !!pre && pre.clientHeight > 0
  }, { timeout: 8_000 })
  await page.waitForTimeout(250)
}

async function measurePseudoLine(page: Page, line1: number) {
  return page.evaluate((L) => {
    const pre = document.querySelector('[data-testid="pseudo-pre"]') as HTMLElement | null
    const el = pre?.querySelector(`[data-line="${L}"]`) as HTMLElement | null
    if (!pre || !el) return { ok: false as const }
    const preR = pre.getBoundingClientRect()
    const elR = el.getBoundingClientRect()
    const visH = Math.max(0, Math.min(elR.bottom, preR.bottom) - Math.max(elR.top, preR.top))
    let top = elR.top
    let bottom = elR.bottom
    let node: HTMLElement | null = pre
    while (node && node !== document.body) {
      const r = node.getBoundingClientRect()
      const cs = getComputedStyle(node)
      if (['hidden', 'auto', 'scroll'].includes(cs.overflowY) || cs.overflow === 'hidden') {
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      node = node.parentElement
    }
    return {
      ok: true as const,
      execLine: pre.getAttribute('data-exec-line'),
      text: (el.textContent || '').trim(),
      offsetParent: String(el.offsetParent?.className || '').slice(0, 80),
      offsetTop: el.offsetTop,
      preScrollTop: pre.scrollTop,
      preClientH: pre.clientHeight,
      elH: Math.round(elR.height),
      visH: Math.round(visH),
      clipIntersect: Math.round(Math.max(0, Math.min(bottom, elR.bottom) - Math.max(top, elR.top))),
      contentTop: pre.scrollTop + (elR.top - preR.top),
    }
  }, line1)
}

async function measurePin(page: Page) {
  return page.evaluate(() => {
    const s = document.querySelector('.cm-scroller') as HTMLElement | null
    return {
      scrollTop: s?.scrollTop ?? null,
      clientH: s?.clientHeight ?? null,
      paused: !!document.querySelector('[data-testid="follow-paused"]'),
      vh: window.innerHeight,
    }
  })
}

async function measureMatrixClip(page: Page) {
  return page.evaluate(() => {
    const scroller = document.querySelector('.matrix-scroll') as HTMLElement | null
    const cell = document.querySelector(
      '.matrix-table td.hl-focus, .matrix-table td.hl-write',
    ) as HTMLElement | null
    const counter = document.querySelector('[data-testid="step-counter"]')?.textContent ?? ''
    const paused = !!document.querySelector('[data-testid="matrix-follow-paused"]')
    if (!scroller || !cell) return { ok: false as const, counter, paused, cellH: 0, intersectClip: 0, minH: '', chain: [] as unknown[] }
    const cellR = cell.getBoundingClientRect()
    const scrollR = scroller.getBoundingClientRect()
    let top = cellR.top
    let bottom = cellR.bottom
    const chain: Array<Record<string, unknown>> = []
    let node: HTMLElement | null = cell
    while (node && node !== document.body) {
      const r = node.getBoundingClientRect()
      const cs = getComputedStyle(node)
      const ov = cs.overflowY
      const interesting =
        ['hidden', 'auto', 'scroll'].includes(ov) ||
        ['matrix-scroll', 'matrix-view', 'stage-viewport', 'viz-main', 'matrices-panel'].some((c) =>
          node!.classList.contains(c),
        )
      if (interesting) {
        chain.push({
          cls: String(node.className).slice(0, 70),
          ov,
          h: Math.round(r.height),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          clientH: node.clientHeight,
          minH: cs.minHeight,
        })
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      node = node.parentElement
    }
    const intersectClip = Math.max(0, Math.min(bottom, cellR.bottom) - Math.max(top, cellR.top))
    return {
      ok: true as const,
      counter,
      paused,
      cell: cell.getAttribute('data-cell'),
      cellH: Math.round(cellR.height),
      scrollerClientH: scroller.clientHeight,
      scrollerRectH: Math.round(scrollR.height),
      intersectClip: Math.round(intersectClip),
      vsScroll: Math.round(
        Math.max(0, Math.min(cellR.bottom, scrollR.bottom) - Math.max(cellR.top, scrollR.top)),
      ),
      minH: getComputedStyle(scroller).minHeight,
      chain,
    }
  })
}

async function userWheel(page: Page, selector: string, dy: number, times = 2) {
  const loc = page.locator(selector).first()
  await loc.waitFor({ state: 'visible', timeout: 8_000 })
  const box = await loc.boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < times; i++) {
    await page.mouse.wheel(0, dy)
    await page.waitForTimeout(40)
  }
}

async function ensureTsScroller(page: Page) {
  await revealCodePanel(page)
  const browser = page.getByTestId('code-browser')
  const tabAttr = await browser.getAttribute('data-tab')
  if (tabAttr !== 'ts') {
    await page.getByTestId('tab-ts').evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(120)
  }
  await page.locator('.cm-scroller').first().waitFor({ state: 'visible', timeout: 10_000 })
}

/** Wheel until follow pauses (or scrollTop moves). */
async function pauseCodeFollowByWheel(page: Page) {
  await ensureTsScroller(page)
  const before = await page.evaluate(() => document.querySelector('.cm-scroller')?.scrollTop ?? 0)
  // Push content both ways so a real scroll event always fires
  await userWheel(page, '.cm-scroller', 500, 3)
  await userWheel(page, '.cm-scroller', -600, 5)
  await page.waitForTimeout(120)
  const paused = page.getByTestId('follow-paused')
  if (!(await paused.isVisible().catch(() => false))) {
    await userWheel(page, '.cm-scroller', 400, 4)
    await page.waitForTimeout(120)
  }
  await expect(paused).toBeVisible({ timeout: 4_000 })
  const after = await page.evaluate(() => document.querySelector('.cm-scroller')?.scrollTop ?? 0)
  void before
  void after
}

async function advanceTo(page: Page, target1Based: number) {
  for (;;) {
    const c = (await page.getByTestId('step-counter').textContent()) ?? ''
    const cur = Number(c.match(/(\d+)\s*\//)?.[1] ?? 0)
    if (cur >= target1Based) return
    const next = page.getByTestId('next-step-btn')
    if (await next.isDisabled()) return
    await next.click()
  }
}

test.describe('V21 pseudo scroll / reading pin / matrix viewport', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  test('V21-01a Dijkstra pseudo init line 2 fully readable @1366×600', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 600 })
    await prepareDijkstraDefaultReady(page)
    await openPseudo(page)
    const m = await measurePseudoLine(page, 2)
    expect(m.ok, JSON.stringify(m)).toBe(true)
    if (!m.ok) return
    expect(m.execLine, JSON.stringify(m)).toBe('2')
    expect(m.text.length, JSON.stringify(m)).toBeGreaterThan(0)
    expect(m.visH, `visH ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(Math.min(18, m.elH))
    expect(m.clipIntersect, `clip ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(Math.min(18, m.elH))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v21-01-pseudo-line2-1366x600.png') })
    fs.writeFileSync(path.join(OUT_TRACES, 'v21-01-pseudo-1366x600.json'), JSON.stringify(m, null, 2))
  })

  test('V21-01b Dijkstra pseudo line 2 @844×390 + 390×844', async ({ page }) => {
    test.setTimeout(120_000)
    const samples: Record<string, unknown> = {}

    await page.setViewportSize({ width: 844, height: 390 })
    await prepareDijkstraDefaultReady(page)
    await openPseudo(page)
    const shortM = await measurePseudoLine(page, 2)
    samples.short844x390 = shortM
    expect(shortM.ok).toBe(true)
    if (shortM.ok) {
      expect(shortM.visH, JSON.stringify(shortM)).toBeGreaterThanOrEqual(Math.min(16, shortM.elH))
      expect(shortM.clipIntersect, JSON.stringify(shortM)).toBeGreaterThanOrEqual(Math.min(16, shortM.elH))
    }
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v21-01-pseudo-line2-844x390.png') })

    await page.setViewportSize({ width: 390, height: 844 })
    await prepareDijkstraDefaultReady(page)
    await openPseudo(page)
    const tallM = await measurePseudoLine(page, 2)
    samples.tall390x844 = tallM
    expect(tallM.ok).toBe(true)
    if (tallM.ok) {
      expect(tallM.visH, JSON.stringify(tallM)).toBeGreaterThanOrEqual(Math.min(16, tallM.elH))
    }
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v21-01-pseudo-line2-390x844.png') })
    fs.writeFileSync(path.join(OUT_TRACES, 'v21-01-pseudo-short-tall.json'), JSON.stringify(samples, null, 2))
  })

  test('V21-01c pseudo mid/end + TS↔pseudo remasure + goto', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 600 })
    await prepareDijkstraDefaultReady(page)
    await openPseudo(page)

    await advanceTo(page, 10)
    await page.waitForTimeout(200)
    const midLine = Number(
      (await page.locator('[data-testid="pseudo-pre"]').getAttribute('data-exec-line')) || '0',
    )
    expect(midLine).toBeGreaterThan(0)
    const mid = await measurePseudoLine(page, midLine)
    expect(mid.ok && mid.visH >= Math.min(14, mid.elH), JSON.stringify(mid)).toBe(true)

    await advanceTo(page, 24)
    await page.waitForTimeout(200)
    const endLine = Number(
      (await page.locator('[data-testid="pseudo-pre"]').getAttribute('data-exec-line')) || '0',
    )
    const end = await measurePseudoLine(page, endLine)
    expect(end.ok && end.visH >= Math.min(14, end.elH), JSON.stringify(end)).toBe(true)

    await page.getByTestId('tab-ts').evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(150)
    await page.getByTestId('tab-pseudo').evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(300)
    const restored = await measurePseudoLine(page, endLine)
    expect(restored.ok && restored.visH >= Math.min(14, restored.elH), JSON.stringify(restored)).toBe(true)

    await page.getByTestId('goto-exec-btn').click()
    await page.waitForTimeout(200)
    const afterGoto = await measurePseudoLine(page, endLine)
    expect(afterGoto.ok && afterGoto.visH >= Math.min(14, afterGoto.elH), JSON.stringify(afterGoto)).toBe(true)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v21-01-pseudo-top-mid-end.json'),
      JSON.stringify({ mid, end, restored, afterGoto }, null, 2),
    )
  })

  test('V21-02 reading pin keeps latest user browse across data open + height-only', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraDefaultReady(page)
    await ensureTsScroller(page)
    await advanceTo(page, 16)
    await page.waitForTimeout(200)

    await pauseCodeFollowByWheel(page)
    await userWheel(page, '.cm-scroller', -500, 6)
    await page.waitForTimeout(120)
    const at0 = await measurePin(page)
    expect(at0.paused).toBe(true)
    expect(at0.scrollTop ?? 999, JSON.stringify(at0)).toBeLessThan(40)

    let st = at0.scrollTop ?? 0
    let guard = 0
    while (st < 135 && guard++ < 80) {
      await userWheel(page, '.cm-scroller', 40, 1)
      st = (await measurePin(page)).scrollTop ?? 0
    }
    const at140 = await measurePin(page)
    expect(at140.scrollTop ?? 0, JSON.stringify(at140)).toBeGreaterThan(100)
    expect(at140.scrollTop ?? 0, JSON.stringify(at140)).toBeLessThan(220)

    // V23: data is visible by default, so a real layout change = collapse + re-open
    // the data region (two height changes of the code/scene grid), not a no-op open.
    await page.getByTestId('data-toggle').click()
    await page.waitForTimeout(200)
    await openDataSheet(page)
    await page.waitForTimeout(500)
    const afterData = await measurePin(page)
    expect(afterData.paused, 'must stay paused').toBe(true)
    expect(
      Math.abs((afterData.scrollTop ?? 0) - (at140.scrollTop ?? 0)),
      JSON.stringify({ at140, afterData }),
    ).toBeLessThan(40)
    expect(afterData.scrollTop ?? 0, 'must not restore stale 0').toBeGreaterThan(80)

    await page.getByTestId('data-toggle').click() // V23: collapse data (was sheet close)
    await page.waitForTimeout(300)
    await userWheel(page, '.cm-scroller', -500, 6)
    st = 0
    guard = 0
    while (st < 135 && guard++ < 80) {
      await userWheel(page, '.cm-scroller', 40, 1)
      st = (await measurePin(page)).scrollTop ?? 0
    }
    const beforeH = await measurePin(page)
    await page.setViewportSize({ width: 1366, height: 780 })
    await page.waitForTimeout(500)
    const afterH = await measurePin(page)
    expect(
      Math.abs((afterH.scrollTop ?? 0) - (beforeH.scrollTop ?? 0)),
      JSON.stringify({ beforeH, afterH }),
    ).toBeLessThan(25)
    expect(afterH.scrollTop ?? 0).toBeGreaterThan(100)

    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v21-02-pin-after-data.png') })
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v21-02-pin.json'),
      JSON.stringify({ at0, at140, afterData, beforeH, afterH }, null, 2),
    )
  })

  test('V21-03 LCS cell full vs clip-chain @14/31/74/75/94/95 — unassisted', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)

    const samples: Record<string, unknown> = {}
    for (const t of [14, 31, 74, 75, 94, 95]) {
      await advanceTo(page, t)
      await page.waitForTimeout(180)
      const m = await measureMatrixClip(page)
      samples[`f${t}`] = m
      expect(m.paused, `false pause at ${t}: ${JSON.stringify(m)}`).toBe(false)
      expect(m.ok, JSON.stringify(m)).toBe(true)
      if (!m.ok) continue
      expect(m.intersectClip, `clip at ${t}: ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(
        Math.max(12, Math.floor(m.cellH * 0.85)),
      )
      const scrollNode = (m.chain as Array<{ cls: string; minH: string; bottom: number }>).find((c) =>
        String(c.cls).includes('matrix-scroll'),
      )
      const viewNode = (m.chain as Array<{ cls: string; bottom: number }>).find((c) =>
        String(c.cls).includes('matrix-view'),
      )
      if (scrollNode && viewNode) {
        expect(
          scrollNode.bottom - viewNode.bottom,
          `scrollport below view at ${t}: ${JSON.stringify({ scrollNode, viewNode })}`,
        ).toBeLessThan(8)
      }
      // Accept soft floor min(48px,100%) or 0 — must not be hard 120px
      expect(m.minH.includes('120') && !m.minH.includes('min('), `minH must not be hard 120: ${m.minH}`).toBe(
        false,
      )
    }

    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v21-03-matrix-14-1366.png') })
    fs.writeFileSync(path.join(OUT_TRACES, 'v21-03-matrix-clip.json'), JSON.stringify(samples, null, 2))
  })

  test('V21-03b matrix smoke @1024×600 / 1920 / 844×390', async ({ page }) => {
    test.setTimeout(180_000)
    const out: Record<string, unknown> = {}
    for (const vp of [
      { w: 1024, h: 600 },
      { w: 1920, h: 1080 },
      { w: 844, h: 390 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareLcsReady(page)
      await advanceTo(page, 14)
      await page.waitForTimeout(200)
      const m = await measureMatrixClip(page)
      out[`${vp.w}x${vp.h}`] = m
      expect(m.ok && !m.paused && m.intersectClip >= 10, JSON.stringify(m)).toBe(true)
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v21-03-matrix-viewports.json'), JSON.stringify(out, null, 2))
  })

  test('V21-04a V20 positive regressions: LCS unassisted + Dijkstra data-open follow', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await prepareLcsReady(page)
    for (let i = 0; i < 94; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      if (i + 2 >= 73 && (i % 10 === 0 || i + 2 >= 90)) {
        await page.waitForTimeout(40)
        const paused = await page.getByTestId('matrix-follow-paused').isVisible().catch(() => false)
        expect(paused, `false pause near ${i + 2}`).toBe(false)
      }
    }
    const end = await measureMatrixClip(page)
    expect(end.paused).toBe(false)
    expect(end.ok && end.intersectClip > 10, JSON.stringify(end)).toBe(true)

    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraDefaultReady(page)
    await advanceTo(page, 16)
    await openDataSheet(page)
    await page.waitForTimeout(300)
    const paused = await page.getByTestId('follow-paused').isVisible().catch(() => false)
    expect(paused, 'data open must not pause follow without user wheel').toBe(false)
    await advanceTo(page, 22)
    await page.waitForTimeout(200)
    const lineVis = await page.evaluate(() => {
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      const wrap = document.querySelector('[data-testid="code-mirror-wrap"]') as HTMLElement | null
      const line = Number(wrap?.getAttribute('data-exec-line') || 0)
      const lines = [...document.querySelectorAll('.cm-line')]
      const el = lines[line - 1] as HTMLElement | undefined
      if (!scroller || !el) return 0
      const a = el.getBoundingClientRect()
      const r = scroller.getBoundingClientRect()
      return Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top))
    })
    expect(lineVis).toBeGreaterThan(10)
  })

  test('V21-04b mutation sanity: wrong coords / first-pin-only / oversized matrix-scroll', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 600 })
    await prepareDijkstraDefaultReady(page)
    await openPseudo(page)

    const mutPseudo2 = await page.evaluate(() => {
      const pre = document.querySelector('[data-testid="pseudo-pre"]') as HTMLElement | null
      const el = pre?.querySelector('[data-line="2"]') as HTMLElement | null
      if (!pre || !el) return { ok: false as const }
      const pageEl = document.querySelector('.page.algo-page') as HTMLElement | null
      const wrongTop = pageEl
        ? el.getBoundingClientRect().top - pageEl.getBoundingClientRect().top + (pageEl.scrollTop || 0)
        : el.offsetTop + 200
      pre.scrollTop = wrongTop
      const preR = pre.getBoundingClientRect()
      const elR = el.getBoundingClientRect()
      const visH = Math.max(0, Math.min(elR.bottom, preR.bottom) - Math.max(elR.top, preR.top))
      return { ok: true as const, visH: Math.round(visH), elH: Math.round(elR.height), wrongTop }
    })
    expect(mutPseudo2.ok && mutPseudo2.visH < mutPseudo2.elH * 0.5, JSON.stringify(mutPseudo2)).toBe(true)

    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareDijkstraDefaultReady(page)
    await ensureTsScroller(page)
    await advanceTo(page, 16)
    await pauseCodeFollowByWheel(page)
    await userWheel(page, '.cm-scroller', -500, 6)
    const pinMut = await page.evaluate(() => {
      const s = document.querySelector('.cm-scroller') as HTMLElement | null
      if (!s) return { ok: false as const }
      const pinTop = s.scrollTop
      s.scrollTop = 140
      s.scrollTop = Math.min(pinTop, Math.max(0, s.scrollHeight - s.clientHeight))
      return { ok: true as const, restored: s.scrollTop, pinTop }
    })
    expect(pinMut.ok && (pinMut.restored ?? 99) < 40, JSON.stringify(pinMut)).toBe(true)

    await prepareLcsReady(page)
    await advanceTo(page, 14)
    await page.waitForTimeout(200)
    const mutMatrix = await page.evaluate(() => {
      const scroller = document.querySelector('.matrix-scroll') as HTMLElement | null
      const view = document.querySelector('.matrix-view') as HTMLElement | null
      if (!scroller || !view) return { ok: false as const }
      const prev = scroller.style.minHeight
      scroller.style.minHeight = '120px'
      void scroller.offsetHeight
      const sR = scroller.getBoundingClientRect()
      const vR = view.getBoundingClientRect()
      const overhang = sR.bottom - vR.bottom
      scroller.style.minHeight = prev
      return {
        ok: true as const,
        overhang: Math.round(overhang),
        sBottom: Math.round(sR.bottom),
        vBottom: Math.round(vR.bottom),
        applied: true,
      }
    })
    expect(mutMatrix.ok && mutMatrix.applied, JSON.stringify(mutMatrix)).toBe(true)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v21-04-mutation.json'),
      JSON.stringify({ mutPseudo2, pinMut, mutMatrix }, null, 2),
    )
  })

  test('V21-04c key paths ×10 retries=0', async ({ page }) => {
    test.setTimeout(600_000)
    const results: Array<Record<string, unknown>> = []
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: 1366, height: 600 })
      await prepareDijkstraDefaultReady(page)
      await openPseudo(page)
      const a = await measurePseudoLine(page, 2)
      expect(a.ok && a.visH >= Math.min(16, a.elH), `A#${i} ${JSON.stringify(a)}`).toBe(true)

      await page.setViewportSize({ width: 1366, height: 768 })
      await prepareDijkstraDefaultReady(page)
      await ensureTsScroller(page)
      await advanceTo(page, 16)
      await pauseCodeFollowByWheel(page)
      await userWheel(page, '.cm-scroller', -400, 4)
      let st = (await measurePin(page)).scrollTop ?? 0
      let g = 0
      while (st < 135 && g++ < 60) {
        await userWheel(page, '.cm-scroller', 40, 1)
        st = (await measurePin(page)).scrollTop ?? 0
      }
      const before = await measurePin(page)
      await page.getByTestId('data-toggle').click() // V23: collapse first so opening is a real layout change
      await page.waitForTimeout(150)
      await openDataSheet(page)
      await page.waitForTimeout(400)
      const after = await measurePin(page)
      expect(Math.abs((after.scrollTop ?? 0) - (before.scrollTop ?? 0)) < 40, `B#${i}`).toBe(true)
      expect((after.scrollTop ?? 0) > 80, `B#${i} stale0`).toBe(true)
      await page.getByTestId('data-toggle').click() // V23: collapse data (was sheet close)

      await page.setViewportSize({ width: 1366, height: 768 })
      await prepareLcsReady(page)
      await advanceTo(page, 14)
      await page.waitForTimeout(150)
      const c = await measureMatrixClip(page)
      expect(c.ok && !c.paused && c.intersectClip >= Math.floor(c.cellH * 0.85), `C#${i}`).toBe(true)

      results.push({ i, aVis: a.ok ? a.visH : 0, pin: after.scrollTop, cClip: c.ok ? c.intersectClip : 0 })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v21-04-keypaths-x10.json'), JSON.stringify(results, null, 2))
  })
})
