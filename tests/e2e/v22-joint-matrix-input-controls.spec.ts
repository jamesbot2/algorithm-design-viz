import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { waitForRunReady } from './helpers/runReadiness'
import { measureJoint } from './helpers/jointReadable'
import { ensureInputEditing } from './helpers/ensureInputEditing'

const OUT_SHOTS = path.join(process.cwd(), 'docs/screenshots/v22')
const OUT_TRACES = path.join(process.cwd(), 'docs/traces/v22')

function ensureDirs() {
  fs.mkdirSync(path.join(OUT_SHOTS, 'before'), { recursive: true })
  fs.mkdirSync(path.join(OUT_SHOTS, 'after'), { recursive: true })
  fs.mkdirSync(OUT_TRACES, { recursive: true })
}

async function prepareAlgoReady(page: Page, algo: string, minSteps: number) {
  await page.goto(`#/algo/${algo}`)
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
  return waitForRunReady(page, { expectRunId: runId ?? undefined, minSteps })
}

async function prepareLcsReady(page: Page) {
  return prepareAlgoReady(page, 'lcs', 90)
}

async function advanceTo(page: Page, frame: number) {
  const cur = await page.evaluate(() => {
    const t = document.querySelector('[data-testid="step-counter"]')?.textContent || ''
    const m = t.match(/(\d+)\s*\//)
    return m ? Number(m[1]) : 1
  })
  for (let i = cur; i < frame; i++) {
    const next = page.getByTestId('next-step-btn')
    if (await next.isDisabled()) break
    await next.click()
  }
  await page.waitForTimeout(180)
}

function assertJointReadable(
  m: Awaited<ReturnType<typeof measureJoint>>,
  opts: { desktopCode?: boolean; label?: string } = {},
) {
  const tag = opts.label ?? JSON.stringify(m).slice(0, 200)
  expect(m.glyphs.total, tag).toBeGreaterThan(0)
  expect(m.glyphs.fullReadable, tag).toBe(m.glyphs.total)
  expect(m.glyphs.falsePos8, tag).toBe(0)
  expect(m.locate.ok && m.locate.visH >= m.locate.elH * 0.9 - 0.5, `locate ${tag}`).toBe(true)
  expect(m.resume.ok && m.resume.visH >= m.resume.elH * 0.9 - 0.5, `resume ${tag}`).toBe(true)
  expect(m.locate.hit, `locate hit ${tag}`).toBe(true)
  if (m.matrix.cellOk) {
    expect(m.matrix.cellIntersect, `cell ${tag}`).toBeGreaterThanOrEqual(
      Math.floor(m.matrix.cellH * 0.85),
    )
    expect(m.matrix.overhang, `overhang ${tag}`).toBeLessThanOrEqual(1)
    expect(m.matrix.minH, tag).not.toMatch(/^120px$/)
  }
  if (opts.desktopCode !== false && m.vp.w >= 1024) {
    expect(m.code.wrapW, `code w ${tag}`).toBeGreaterThan(40)
  }
}

test.describe('V22 joint matrix + input + controls', () => {
  test.describe.configure({ retries: 0 })
  test.beforeAll(() => ensureDirs())

  test('V22-01 compact strip glyphs fully visible @ key viewports LCS frame 14', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const results: Record<string, unknown> = {}
    for (const vp of [
      { w: 1366, h: 768 },
      { w: 1024, h: 600 },
      { w: 1920, h: 1080 },
      { w: 390, h: 844 },
      { w: 844, h: 390 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareLcsReady(page)
      await advanceTo(page, 14)
      const m = await measureJoint(page)
      expect(m.counter).toMatch(/14\s*\/\s*95/)
      assertJointReadable(m, { label: `${vp.w}x${vp.h}` })
      results[`${vp.w}x${vp.h}`] = {
        stripH: m.stripH,
        glyphMinVis: m.glyphs.minVisH,
        glyphAvgH: m.glyphs.avgElH,
        locateVis: m.locate.visH,
        locateH: m.locate.elH,
        cellIntersect: m.matrix.cellIntersect,
        cellH: m.matrix.cellH,
        scrollH: m.matrix.scrollH,
      }
      await page.screenshot({
        path: path.join(OUT_SHOTS, 'after', `v22-01-lcs14-${vp.w}x${vp.h}.png`),
      })
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v22-01-strip.json'), JSON.stringify(results, null, 2))
  })

  test('V22-02 follow-bar locate/resume full geometry + hit @1366/1024', async ({ page }) => {
    test.setTimeout(90_000)
    const out: Record<string, unknown> = {}
    for (const vp of [
      { w: 1366, h: 768 },
      { w: 1024, h: 600 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await prepareLcsReady(page)
      await advanceTo(page, 14)
      const m = await measureJoint(page)
      expect(m.locate.visH, JSON.stringify(m.locate)).toBeGreaterThanOrEqual(m.locate.elH * 0.9)
      expect(m.resume.visH, JSON.stringify(m.resume)).toBeGreaterThanOrEqual(m.resume.elH * 0.9)
      expect(m.locate.hit).toBe(true)
      // Click without force — appearance must match hit face
      await page.getByTestId('matrix-locate-btn').click()
      await page.waitForTimeout(120)
      out[`${vp.w}`] = m.locate
    }
    fs.writeFileSync(path.join(OUT_TRACES, 'v22-02-follow-bar.json'), JSON.stringify(out, null, 2))
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v22-02-follow-bar-1366.png') })
  })

  test('V22-03a same-frame joint LCS frames + editDist + knapsack', async ({ page }) => {
    test.setTimeout(300_000)
    const log: Array<Record<string, unknown>> = []

    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    const runId = await page.getByTestId('visualizer').getAttribute('data-run-id')
    for (const frame of [1, 14, 31, 74, 75, 94, 95]) {
      await advanceTo(page, frame)
      // Measure BEFORE any rescue / scrollIntoView
      const m = await measureJoint(page)
      expect(m.runId).toBe(runId)
      expect(m.matrix.paused, `no false pause @${frame}`).toBe(false)
      assertJointReadable(m, { label: `LCS@${frame}` })
      log.push({ algo: 'lcs', frame, ...{
        glyphFull: m.glyphs.fullReadable,
        locateVis: m.locate.visH,
        cellIntersect: m.matrix.cellIntersect,
        codeW: m.code.wrapW,
      }})
    }
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v22-03-lcs-95.png') })

    await prepareAlgoReady(page, 'editDistance', 20)
    await advanceTo(page, 10)
    const ed = await measureJoint(page)
    if (ed.glyphs.total > 0) assertJointReadable(ed, { label: 'editDistance' })
    log.push({ algo: 'editDistance', glyphs: ed.glyphs.fullReadable, cell: ed.matrix.cellIntersect })

    await prepareAlgoReady(page, 'knapsack01', 10)
    await advanceTo(page, 8)
    const kn = await measureJoint(page)
    expect(kn.glyphs.total).toBeGreaterThan(0)
    assertJointReadable(kn, { label: 'knapsack01' })
    log.push({ algo: 'knapsack01', glyphs: kn.glyphs.fullReadable, cell: kn.matrix.cellIntersect })
    await page.screenshot({ path: path.join(OUT_SHOTS, 'after', 'v22-03-knapsack.png') })

    fs.writeFileSync(path.join(OUT_TRACES, 'v22-03-joint-frames.json'), JSON.stringify(log, null, 2))
  })

  test('V22-03b unassisted LCS walk (no resume/locate rescue) + Dijkstra pseudo smoke', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    for (let i = 1; i < 95; i++) {
      const next = page.getByTestId('next-step-btn')
      if (await next.isDisabled()) break
      await next.click()
      if (i === 13 || i === 30 || i === 73 || i === 94) {
        await page.waitForTimeout(100)
        const paused = await page.getByTestId('matrix-follow-paused').isVisible().catch(() => false)
        expect(paused, `false pause near ${i + 1}`).toBe(false)
        const m = await measureJoint(page)
        // Deliberately do NOT click resume/locate
        assertJointReadable(m, { label: `unassisted@${i + 1}` })
      }
    }

    await prepareAlgoReady(page, 'dijkstra', 20)
    const layout = await page.getByTestId('workbench-layout').getAttribute('data-layout')
    if (layout === 'tabs') {
      await page.locator('.workbench-tabs button[role="tab"]', { hasText: '代码' }).click()
    }
    await page.getByTestId('tab-pseudo').evaluate((el) => (el as HTMLElement).click())
    await page.waitForTimeout(200)
    const pseudo = await page.evaluate(() => {
      const pre = document.querySelector('[data-testid="pseudo-pre"]') as HTMLElement | null
      const el = pre?.querySelector('[data-line="2"]') as HTMLElement | null
      if (!pre || !el) return { ok: false as const, visH: 0, elH: 0 }
      const a = el.getBoundingClientRect()
      const c = pre.getBoundingClientRect()
      return {
        ok: true as const,
        visH: Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)),
        elH: a.height,
      }
    })
    expect(pseudo.ok && pseudo.visH >= Math.min(16, pseudo.elH * 0.9), JSON.stringify(pseudo)).toBe(
      true,
    )
    fs.writeFileSync(
      path.join(OUT_TRACES, 'v22-03-unassisted.json'),
      JSON.stringify({ walked: 95, pseudo }, null, 2),
    )
  })

  test('V22-03c mutations: strip 10px / bar 6px / matrix overhang / code w=0', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1366, height: 768 })
    await prepareLcsReady(page)
    await advanceTo(page, 14)
    const before = await measureJoint(page)
    assertJointReadable(before, { label: 'pre-mutation' })

    const mutStrip = await page.evaluate(() => {
      const strip = document.querySelector('[data-testid="array-labels"]') as HTMLElement | null
      if (!strip) return { ok: false as const }
      const prev = { maxH: strip.style.maxHeight, ov: strip.style.overflow, minH: strip.style.minHeight }
      strip.style.maxHeight = '10px'
      strip.style.minHeight = '10px'
      strip.style.overflow = 'hidden'
      void strip.offsetHeight
      const chars = [...document.querySelectorAll('[data-testid="array-labels"] .compact-ch')]
      const bad = chars.filter((el) => {
        const a = el.getBoundingClientRect()
        const c = strip.getBoundingClientRect()
        const vis = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
        return !(a.height > 0 && vis >= Math.min(a.height * 0.9, a.height - 0.5))
      }).length
      strip.style.maxHeight = prev.maxH
      strip.style.minHeight = prev.minH
      strip.style.overflow = prev.ov
      return { ok: true as const, crushed: bad, total: chars.length }
    })
    expect(mutStrip.ok && mutStrip.crushed > 0, JSON.stringify(mutStrip)).toBe(true)

    const mutBar = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="matrix-follow-bar"]') as HTMLElement | null
      const btn = document.querySelector('[data-testid="matrix-locate-btn"]') as HTMLElement | null
      if (!bar || !btn) return { ok: false as const }
      const prev = { maxH: bar.style.maxHeight, ov: bar.style.overflow, minH: bar.style.minHeight }
      bar.style.maxHeight = '6px'
      bar.style.minHeight = '6px'
      bar.style.overflow = 'hidden'
      void bar.offsetHeight
      const a = btn.getBoundingClientRect()
      const c = bar.getBoundingClientRect()
      const vis = Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
      bar.style.maxHeight = prev.maxH
      bar.style.minHeight = prev.minH
      bar.style.overflow = prev.ov
      return { ok: true as const, visH: vis, elH: a.height, fail: vis < a.height * 0.9 }
    })
    expect(mutBar.ok && mutBar.fail, JSON.stringify(mutBar)).toBe(true)

    const mutMatrix = await page.evaluate(() => {
      const scroller = document.querySelector('.matrix-scroll') as HTMLElement | null
      const panel = document.querySelector('.matrices-panel') as HTMLElement | null
      const stage = (document.querySelector('.stage-viewport') ||
        document.querySelector('.viz-main')) as HTMLElement | null
      if (!scroller || !panel || !stage) return { ok: false as const }
      const prev = {
        minH: scroller.style.minHeight,
        maxH: scroller.style.maxHeight,
        h: scroller.style.height,
        flex: scroller.style.flex,
      }
      // Force scrollport taller than stage/panel (same “taller than parent” fail class as V21 hard 120).
      // V23 replacement note: the fixed 240px no longer exceeded V23's taller stage
      // (overhang 0.45 → the fault did not manifest), so the forced height is now
      // derived from the stage: stage height + 200px always overhangs it.
      scroller.style.maxHeight = 'none'
      scroller.style.minHeight = '0'
      scroller.style.flex = '0 0 auto'
      scroller.style.height = `${Math.ceil(stage.getBoundingClientRect().height) + 200}px`
      void scroller.offsetHeight
      const sBottom = scroller.getBoundingClientRect().bottom
      const overhang = Math.max(
        sBottom - panel.getBoundingClientRect().bottom,
        sBottom - stage.getBoundingClientRect().bottom,
      )
      scroller.style.minHeight = prev.minH
      scroller.style.maxHeight = prev.maxH
      scroller.style.height = prev.h
      scroller.style.flex = prev.flex
      return { ok: true as const, overhang, fail: overhang > 2 }
    })
    expect(mutMatrix.ok && mutMatrix.fail, JSON.stringify(mutMatrix)).toBe(true)

    const mutCode = await page.evaluate(() => {
      const wrap = document.querySelector('[data-testid="code-mirror-wrap"]') as HTMLElement | null
      if (!wrap) return { ok: false as const }
      const prev = wrap.style.width
      wrap.style.width = '0px'
      void wrap.offsetHeight
      const w = wrap.getBoundingClientRect().width
      wrap.style.width = prev
      return { ok: true as const, w, fail: w < 1 }
    })
    expect(mutCode.ok && mutCode.fail, JSON.stringify(mutCode)).toBe(true)

    const after = await measureJoint(page)
    assertJointReadable(after, { label: 'post-restore' })

    fs.writeFileSync(
      path.join(OUT_TRACES, 'v22-03-mutation.json'),
      JSON.stringify({ mutStrip, mutBar, mutMatrix, mutCode, before, after }, null, 2),
    )
  })

  test('V22-03d merge/insert buffer smoke + 1024/390 joint', async ({ page }) => {
    test.setTimeout(120_000)
    for (const algo of ['mergeSort', 'insertionSort'] as const) {
      await page.setViewportSize({ width: 1366, height: 768 })
      await prepareAlgoReady(page, algo, 5)
      await advanceTo(page, 4)
      const stage = await page.evaluate(() => ({
        primary: document.querySelector('[data-primary-scene]')?.getAttribute('data-primary-scene'),
        hasViz: !!document.querySelector('[data-testid="visualizer"]'),
      }))
      expect(stage.hasViz).toBe(true)
    }

    await page.setViewportSize({ width: 1024, height: 600 })
    await prepareLcsReady(page)
    await advanceTo(page, 14)
    assertJointReadable(await measureJoint(page), { label: '1024x600' })

    await page.setViewportSize({ width: 390, height: 844 })
    await prepareLcsReady(page)
    await advanceTo(page, 14)
    const m390 = await measureJoint(page)
    expect(m390.glyphs.fullReadable).toBe(m390.glyphs.total)
    expect(m390.locate.visH).toBeGreaterThanOrEqual(m390.locate.elH * 0.9 - 0.5)
    if (m390.matrix.cellOk) {
      expect(m390.matrix.cellIntersect).toBeGreaterThanOrEqual(Math.floor(m390.matrix.cellH * 0.85))
    }
  })
})
