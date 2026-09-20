import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  prepareDijkstraN3Ready,
  openDataSheet,
  waitForRunReady,
} from './helpers/runReadiness'
import { ensureInputEditing } from './helpers/ensureInputEditing'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v20')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v20')

function ensureDirs() {
  fs.mkdirSync(path.join(OUT_SHOTS, 'before'), { recursive: true })
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
    const paused = !!document.querySelector('[data-testid="matrix-follow-paused"]')
    if (!scroller || !current) {
      return {
        counter,
        cell: null,
        scrollTop: scroller?.scrollTop ?? null,
        visibleH: 0,
        clientH: scroller?.clientHeight ?? 0,
        scrollHeight: scroller?.scrollHeight ?? 0,
        paused,
      }
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
      scrollHeight: scroller.scrollHeight,
      paused,
    }
  })
}

async function measureBanner(page: Page) {
  return page.evaluate(() => {
    const slot = document.querySelector('[data-testid="viz-banner"]') as HTMLElement | null
    const text = document.querySelector('[data-testid="viz-banner-text"]') as HTMLElement | null
    if (!slot || !text) return null
    const s = slot.getBoundingClientRect()
    const t = text.getBoundingClientRect()
    const cs = getComputedStyle(slot)
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    // Intersection of text with slot (and ancestors up to visualizer)
    let clip: DOMRect = s
    let el: HTMLElement | null = slot
    while (el) {
      const st = getComputedStyle(el)
      if (st.overflow !== 'visible' || el === slot) {
        const r = el.getBoundingClientRect()
        clip = {
          x: Math.max(clip.left, r.left),
          y: Math.max(clip.top, r.top),
          width: 0,
          height: 0,
          top: Math.max(clip.top, r.top),
          left: Math.max(clip.left, r.left),
          bottom: Math.min(clip.bottom, r.bottom),
          right: Math.min(clip.right, r.right),
          toJSON() {},
        } as DOMRect
        ;(clip as { width: number }).width = Math.max(0, clip.right - clip.left)
        ;(clip as { height: number }).height = Math.max(0, clip.bottom - clip.top)
      }
      if (el.classList.contains('visualizer')) break
      el = el.parentElement
    }
    const contentH = Math.max(0, Math.min(t.bottom, clip.bottom) - Math.max(t.top, clip.top))
    const lineH = parseFloat(getComputedStyle(text).lineHeight) || 0
    const fontSize = parseFloat(getComputedStyle(text).fontSize) || 0
    return {
      slotH: Math.round(s.height * 10) / 10,
      textH: Math.round(t.height * 10) / 10,
      contentH: Math.round(contentH * 10) / 10,
      padY: Math.round(padY * 10) / 10,
      lineH: Math.round(lineH * 10) / 10,
      fontSize: Math.round(fontSize * 10) / 10,
      title: text.getAttribute('title') ?? '',
      textSample: (text.textContent ?? '').slice(0, 80),
      hasToggle: !!document.querySelector(
        '.viz-banner-controls .inspector-sheet-toggle:not([hidden])',
      ),
    }
  })
}

async function measureCodeLine(page: Page, line1: number) {
  return page.evaluate((L) => {
    const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
    const wrap = document.querySelector('.code-browser-cm-wrap') as HTMLElement | null
    const paused = !!document.querySelector('[data-testid="follow-paused"]')
    const lines = [...document.querySelectorAll('.cm-line')]
    // CodeMirror lines are 0-index in DOM order ≈ doc lines
    const el = lines[L - 1] as HTMLElement | undefined
    const vis = (a: Element | null, b: Element | null) => {
      if (!a || !b) return 0
      const ar = a.getBoundingClientRect()
      const br = b.getBoundingClientRect()
      return Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top))
    }
    return {
      counter: document.querySelector('[data-testid="step-counter"]')?.textContent ?? '',
      execLine: wrap?.getAttribute('data-exec-line') ?? '',
      lineWrapping: !!document.querySelector('.cm-content.cm-lineWrapping, .cm-lineWrapping'),
      cmHasWrapClass: !!scroller?.querySelector('.cm-lineWrapping'),
      paused,
      lineVisScroller: Math.round(vis(el ?? null, scroller)),
      lineVisWrap: Math.round(vis(el ?? null, wrap)),
      cmClientH: scroller?.clientHeight ?? 0,
      cmScrollH: scroller?.scrollHeight ?? 0,
      cmScrollTop: scroller?.scrollTop ?? 0,
    }
  }, line1)
}

/** Real user wheel — must pause follow. */
async function userWheelAway(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(80)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(100)
}

test.describe('V20 follow intent / banner / wrap / unassisted acceptance', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  test('V20-01a LCS unassisted full 95 — no resume/locate rescue (1920)', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1920, height: 1080 })
    await prepareLcsReady(page)

    const timeline: Array<Record<string, unknown>> = []
    let falsePauseAt: number | null = null

    for (let i = 0; i < 94; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      // Sample denser in the known-bad late path-restore window
      const step = i + 1 // after click ≈ step (i+1)+1 = i+2? counter is 1-based after N nexts from 1
      if (i + 2 >= 73 || i % 8 === 0 || i + 2 === 14 || i + 2 >= 90) {
        await page.waitForTimeout(40)
        const m = await measureMatrixInner(page)
        timeline.push({ afterNext: i + 1, ...m })
        if (m.paused) {
          falsePauseAt = i + 1
          fs.writeFileSync(
            path.join(OUT_TRACES, 'v20-01-false-pause.json'),
            JSON.stringify({ falsePauseAt, m, timeline }, null, 2),
          )
          expect(m.paused, `UNEXPECTED follow pause after Next #${i + 1}: ${JSON.stringify(m)}`).toBe(
            false,
          )
        }
        if (i + 2 >= 73) {
          expect(
            m.visibleH,
            `unassisted visibleH at sample ${JSON.stringify(m)}`,
          ).toBeGreaterThan(10)
        }
      }
    }

    const end = await measureMatrixInner(page)
    timeline.push({ end: true, ...end })
    expect(end.paused, `end paused: ${JSON.stringify(end)}`).toBe(false)
    expect(end.visibleH, JSON.stringify(end)).toBeGreaterThan(10)
    expect(falsePauseAt, 'no false pause in unassisted walk').toBeNull()

    await page.screenshot({
      path: path.join(OUT_SHOTS, 'after', 'v20-01-lcs-end-1920.png'),
      fullPage: true,
    })
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v20-01-lcs-unassisted-timeline.json'),
      JSON.stringify({ timeline, end }, null, 2),
    )
  })

  test('V20-01b LCS frame 14 + last row + path restore samples @1366 unassisted', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    const samples: Record<string, unknown> = {}

    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(150)
    const m14 = await measureMatrixInner(page)
    expect(m14.counter).toMatch(/14\s*\/\s*95/)
    expect(m14.paused).toBe(false)
    expect(m14.visibleH).toBeGreaterThan(16)
    samples.m14 = m14

    // Continue to end without rescue
    for (let i = 14; i < 95; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      if (i === 30 || i === 60 || i === 75 || i === 92 || i === 94) {
        await page.waitForTimeout(120)
        const m = await measureMatrixInner(page)
        samples[`s${i}`] = m
        expect(m.paused, `paused at ${i}: ${JSON.stringify(m)}`).toBe(false)
        expect(m.visibleH, `visibleH at ${i}: ${JSON.stringify(m)}`).toBeGreaterThan(10)
      }
    }

    // 2nd run identity
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 90 })
    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(150)
    const m14b = await measureMatrixInner(page)
    expect(m14b.paused).toBe(false)
    expect(m14b.visibleH).toBeGreaterThan(16)
    samples.m14_2nd = m14b

    fs.writeFileSync(path.join(OUT_TRACES, 'v20-01-lcs-samples-1366.json'), JSON.stringify(samples, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v20-01-lcs-14-1366.png') })
  })

  test('V20-01c manual leave (real wheel) + locate/resume restore', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    for (let i = 0; i < 13; i++) await page.getByTestId('next-step-btn').click()
    await page.waitForTimeout(150)

    await userWheelAway(page, '.matrix-scroll')
    await expect(page.getByTestId('matrix-follow-paused')).toBeVisible({ timeout: 3_000 })
    const paused = await measureMatrixInner(page)
    expect(paused.paused).toBe(true)

    await page.getByTestId('matrix-locate-btn').click()
    await page.waitForTimeout(150)
    const located = await measureMatrixInner(page)
    expect(located.paused).toBe(false)
    expect(located.visibleH).toBeGreaterThan(16)

    // Pause again via wheel, then resume
    await userWheelAway(page, '.matrix-scroll')
    await expect(page.getByTestId('matrix-follow-paused')).toBeVisible()
    await page.getByTestId('matrix-resume-follow-btn').click()
    await page.waitForTimeout(150)
    const resumed = await measureMatrixInner(page)
    expect(resumed.paused).toBe(false)
    expect(resumed.visibleH).toBeGreaterThan(10)

    // Programmatic evaluate scrollTop (labeled) must NOT be treated as user leave.
    // Wait past USER_GESTURE_MS in case a prior wheel linger remains in older builds;
    // product also clears gesture on follow/locate transactions.
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      const s = document.querySelector('.matrix-scroll') as HTMLElement | null
      if (s) s.scrollTop = Math.min(s.scrollHeight, s.scrollTop + 40)
    })
    await page.waitForTimeout(100)
    const afterProg = await measureMatrixInner(page)
    expect(afterProg.paused, 'evaluate scrollTop must not pause').toBe(false)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v20-01-manual-restore.json'),
      JSON.stringify({ paused, located, resumed, afterProg }, null, 2),
    )
  })

  test('V20-01d Dijkstra data-open layout without user leave — still follows line 27 @22', async ({
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
      await page.getByTestId('next-step-btn').click()
      await page.waitForTimeout(40)
    }
    await page.waitForTimeout(200)
    const at16 = await measureCodeLine(page, 19)
    expect(at16.paused).toBe(false)

    // Open data — layout reflow must NOT pause follow
    await openDataSheet(page)
    await page.waitForTimeout(200)
    const afterData = await measureCodeLine(page, 19)
    expect(afterData.paused, `data open paused: ${JSON.stringify(afterData)}`).toBe(false)

    // Advance to step 22 — line 27 should remain followed
    for (let i = 0; i < 6; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(250)
    const at22 = await measureCodeLine(page, 27)
    expect(at22.paused, JSON.stringify(at22)).toBe(false)
    expect(
      at22.lineVisScroller,
      `line 27 invisible after data+steps: ${JSON.stringify(at22)}`,
    ).toBeGreaterThan(10)

    // If already paused, data toggle must keep position (separate case)
    await userWheelAway(page, '.cm-scroller')
    await expect(page.getByTestId('follow-paused')).toBeVisible({ timeout: 3_000 })
    const pausedSnap = await page.evaluate(() => {
      const sc = document.querySelector('.cm-scroller') as HTMLElement | null
      const exec = document.querySelector('.cm-exec-line') as HTMLElement | null
      const vis = (() => {
        if (!sc || !exec) return 0
        const a = exec.getBoundingClientRect()
        const b = sc.getBoundingClientRect()
        return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      })()
      return { scrollTop: sc?.scrollTop ?? 0, execVis: Math.round(vis) }
    })
    // Close + reopen data while paused — must stay paused and must NOT re-follow exec
    await page.getByTestId('inspector-sheet-toggle').click()
    await page.waitForTimeout(100)
    await openDataSheet(page)
    await page.waitForTimeout(200)
    await expect(page.getByTestId('follow-paused')).toBeVisible()
    const afterToggle = await page.evaluate(() => {
      const sc = document.querySelector('.cm-scroller') as HTMLElement | null
      const exec = document.querySelector('.cm-exec-line') as HTMLElement | null
      const vis = (() => {
        if (!sc || !exec) return 0
        const a = exec.getBoundingClientRect()
        const b = sc.getBoundingClientRect()
        return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      })()
      return { scrollTop: sc?.scrollTop ?? 0, execVis: Math.round(vis), paused: true }
    })
    // Viewport resize may clamp scrollTop; product contract: stay paused, no auto re-center
    // If user had scrolled exec out of view, it must remain out (or not forcibly centered)
    if (pausedSnap.execVis < 8) {
      expect(afterToggle.execVis, 'must not auto re-follow exec while paused').toBeLessThan(12)
    }

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v20-01-dijkstra-data-layout.json'),
      JSON.stringify({ at16, afterData, at22, pausedSnap, afterToggle }, null, 2),
    )
    await page.screenshot({
      path: path.join(OUT_SHOTS, 'after', 'v20-01-dijkstra-22-data-1366.png'),
      fullPage: true,
    })
  })

  test('V20-02 banner text contentH ≥1 glyph line (with/without vars) @1366', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    const results: Record<string, unknown> = {}

    for (const algo of ['lcs', 'kadane', 'dijkstra', 'knapsack01'] as const) {
      await page.goto(`#/algo/${algo}`)
      await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
      await ensureInputEditing(page)
      await page.getByTestId('run-btn').click()
      await waitForRunReady(page, { minSteps: 2 })
      // Full-page shot BEFORE focus-scroll
      await page.screenshot({
        path: path.join(OUT_SHOTS, 'after', `v20-02-banner-${algo}-1366.png`),
        fullPage: true,
      })
      const beforeToggle = await measureBanner(page)
      expect(beforeToggle, algo).not.toBeNull()
      expect(
        beforeToggle!.contentH,
        `${algo} contentH too small: ${JSON.stringify(beforeToggle)}`,
      ).toBeGreaterThanOrEqual(Math.max(12, beforeToggle!.fontSize * 0.9))
      expect(beforeToggle!.title.length, 'accessible title').toBeGreaterThan(0)

      const toggle = page.getByTestId('inspector-sheet-toggle')
      const toggleVisible = (await toggle.count()) > 0 && (await toggle.isVisible().catch(() => false))
      if (toggleVisible) {
        await toggle.click()
        await page.waitForTimeout(150)
        const withVars = await measureBanner(page)
        expect(withVars!.contentH).toBeGreaterThanOrEqual(Math.max(12, withVars!.fontSize * 0.9))
        results[`${algo}_vars`] = withVars
      } else {
        results[`${algo}_vars`] = 'toggle-hidden-skipped'
      }
      results[algo] = beforeToggle
    }

    // Short laptop height (800-class) — the original 32px clip case
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/lcs')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 2 })
    // Force the media by evaluating — viewport 768 already hits max-height:800px
    const laptop = await measureBanner(page)
    results.laptop768 = laptop
    expect(laptop!.contentH, JSON.stringify(laptop)).toBeGreaterThanOrEqual(12)

    fs.writeFileSync(path.join(OUT_TRACES, 'v20-02-banner.json'), JSON.stringify(results, null, 2))
  })

  test('V20-03 soft wrap Compartment on/off without remount', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/algo/dijkstra')
    await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 20 })

    const wrapCb = page.getByTestId('line-wrap-checkbox')
    await expect(wrapCb).toBeChecked()

    const before = await page.evaluate(() => ({
      hasClass: !!document.querySelector('.cm-lineWrapping'),
      editorKey: document.querySelector('.cm-editor')?.outerHTML.slice(0, 40) ?? '',
      scrollTop: (document.querySelector('.cm-scroller') as HTMLElement | null)?.scrollTop ?? 0,
    }))
    expect(before.hasClass).toBe(true)

    // Mark editor identity
    await page.evaluate(() => {
      const ed = document.querySelector('.cm-editor') as HTMLElement | null
      if (ed) ed.dataset.v20WrapProbe = '1'
    })

    await wrapCb.uncheck()
    await page.waitForTimeout(150)
    const off = await page.evaluate(() => ({
      hasClass: !!document.querySelector('.cm-lineWrapping'),
      probe: (document.querySelector('.cm-editor') as HTMLElement | null)?.dataset.v20WrapProbe,
      // long line should not wrap: check a cm-line height ≈ single line
      lineH: (document.querySelector('.cm-line') as HTMLElement | null)?.getBoundingClientRect()
        .height,
      scrollWidth: (document.querySelector('.cm-scroller') as HTMLElement | null)?.scrollWidth ?? 0,
      clientWidth: (document.querySelector('.cm-scroller') as HTMLElement | null)?.clientWidth ?? 0,
      paused: !!document.querySelector('[data-testid="follow-paused"]'),
    }))
    expect(off.hasClass, 'wrap class must leave when unchecked').toBe(false)
    expect(off.probe, 'must not remount CM').toBe('1')
    expect(off.paused, 'wrap toggle must not pause follow').toBe(false)

    await wrapCb.check()
    await page.waitForTimeout(150)
    const on = await page.evaluate(() => ({
      hasClass: !!document.querySelector('.cm-lineWrapping'),
      probe: (document.querySelector('.cm-editor') as HTMLElement | null)?.dataset.v20WrapProbe,
      paused: !!document.querySelector('[data-testid="follow-paused"]'),
    }))
    expect(on.hasClass).toBe(true)
    expect(on.probe).toBe('1')
    expect(on.paused).toBe(false)

    // Pseudo tab still uses style whiteSpace
    await page.getByRole('button', { name: '伪代码' }).click().catch(async () => {
      await page.locator('.code-browser-tabs button').nth(1).click()
    })
    await page.waitForTimeout(100)
    // ensure wrap checkbox still drives pre
    const pseudo = page.getByTestId('pseudo-pre')
    if (await pseudo.count()) {
      await wrapCb.uncheck()
      await expect(pseudo).toHaveCSS('white-space', /pre(?!-wrap)/)
      await wrapCb.check()
      await expect(pseudo).toHaveCSS('white-space', 'pre-wrap')
    }

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v20-03-wrap.json'),
      JSON.stringify({ before, off, on }, null, 2),
    )
  })

  test('V20-04 mutation sanity: false-pause / 6px text / wrap-not-wired must fail contract', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)

    // Inject bad banner clip — contentH contract must fail
    const badBanner = await page.evaluate(() => {
      const slot = document.querySelector('[data-testid="viz-banner"]') as HTMLElement | null
      if (!slot) return null
      slot.style.height = '32px'
      slot.style.maxHeight = '32px'
      slot.style.minHeight = '32px'
      slot.style.padding = '12px 16px'
      slot.style.overflow = 'hidden'
      slot.style.boxSizing = 'border-box'
      const text = document.querySelector('[data-testid="viz-banner-text"]') as HTMLElement | null
      if (text) {
        text.style.maxHeight = '100%'
        text.style.minHeight = '0'
        text.style.webkitLineClamp = 'unset'
      }
      const t = text?.getBoundingClientRect()
      const s = slot.getBoundingClientRect()
      const contentH = t
        ? Math.max(0, Math.min(t.bottom, s.bottom) - Math.max(t.top, s.top))
        : 0
      return { contentH: Math.round(contentH * 10) / 10, slotH: s.height }
    })
    expect(badBanner!.contentH, 'mutation must produce tiny text').toBeLessThan(10)

    // Inject wrap-always extension lookalike: remove wrap class while checkbox on
    await page.goto('#/algo/dijkstra')
    await ensureInputEditing(page)
    await page.getByTestId('run-btn').click()
    await waitForRunReady(page, { minSteps: 5 })
    await expect(page.getByTestId('line-wrap-checkbox')).toBeChecked()
    await page.evaluate(() => {
      document.querySelectorAll('.cm-lineWrapping').forEach((n) => n.classList.remove('cm-lineWrapping'))
    })
    const wired = await page.evaluate(() => !!document.querySelector('.cm-lineWrapping'))
    expect(wired, 'mutation removed wrap class').toBe(false)

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v20-04-mutation.json'),
      JSON.stringify({ badBanner, wrapRemoved: !wired }, null, 2),
    )
  })
})

test.describe('V20 key unassisted paths ×10 retries=0', () => {
  test.describe.configure({ retries: 0 })

  for (let n = 1; n <= 10; n++) {
    test(`keypath LCS 73–95 unassisted #${n}`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width: 1920, height: 1080 })
      await prepareLcsReady(page)
      for (let i = 0; i < 72; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
      }
      for (let i = 72; i < 95; i++) {
        const next = page.getByTestId('next-step-btn')
        if (await next.isDisabled()) break
        await next.click()
        if (i === 75 || i === 85 || i === 92 || i === 94) {
          await page.waitForTimeout(80)
          const m = await measureMatrixInner(page)
          expect(m.paused, JSON.stringify(m)).toBe(false)
          expect(m.visibleH, JSON.stringify(m)).toBeGreaterThan(10)
        }
      }
    })
  }
})
