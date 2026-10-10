/**
 * V31-01 main-scene-priority run budget (array scenes with reserved companions).
 * The main array gets a readable-priority share of the measured stage; the companion band is one
 * stable height per run, capped by a share of the stage (and the main card's real need), and any
 * frame whose companions exceed it scrolls INSIDE the band with a visible affordance while the
 * current pointers stay painted. Real mouse/keyboard (realClick = page.mouse at the centre), retries 0.
 */
import { test, expect, type Page } from '@playwright/test'
import { prep, realClick, waitSettled, rectPP } from './helpers/v30Motion.mjs'
import { budget, companionReadable, stepTo, desc } from './helpers/v31Budget.mjs'

test.describe.configure({ retries: 0 })

type B = Awaited<ReturnType<typeof budget>>
const share = (b: B) => b.main!.h / (b.main!.h + b.comp!.h)

async function allFrames(page: Page, each?: (b: B) => Promise<void>) {
  const out: B[] = [await budget(page)]
  if (each) await each(out[0]!)
  const next = page.getByTestId('next-step-btn')
  for (let i = 1; i < 400; i++) {
    if (await next.isDisabled()) break
    await realClick(page, next)
    await page.waitForFunction((k) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === k, i, { polling: 'raf' })
    await waitSettled(page)
    const b = await budget(page)
    out.push(b)
    if (each) await each(b)
  }
  return out
}

test.describe('375x812 phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('V31-01 n=16 frame 31/144: main array has priority, companions are not the majority', async ({ page }) => {
    await prep(page, 'mergeSort', desc(16))
    await stepTo(page, 30)
    const b = await budget(page)
    const info = JSON.stringify(b)
    expect(b.counter, info).toMatch(/^31 \/ 144/)
    expect(b.mode).toBe('bars')
    expect(share(b), `main share ${info}`).toBeGreaterThanOrEqual(0.55)
    expect(b.comp!.h, `companion band ≤ 36% of stage ${info}`).toBeLessThanOrEqual(0.36 * b.stageClientH)
    expect(b.maxBar, `bars clearly taller than V30's 32px ${info}`).toBeGreaterThanOrEqual(100)
    for (const e of await companionReadable(page)) {
      expect(e.frac, `companion ${e.t} painted`).toBeGreaterThanOrEqual(0.99)
      expect(e.hit, `companion ${e.t} hit-tests`).toBe(true)
    }
  })

  test('V31-01 n=7: no oversized companion band (aux bar not squeezed into a glyph column)', async ({ page }) => {
    await prep(page, 'mergeSort', desc(7))
    await stepTo(page, 5)
    const b = await budget(page)
    expect(b.comp!.h, JSON.stringify(b)).toBeLessThanOrEqual(0.36 * b.stageClientH)
    expect(share(b), JSON.stringify(b)).toBeGreaterThanOrEqual(0.6)
    // the tree toggle stays one readable line
    const t = await page.getByTestId('aux-toggle-recursion-tree').boundingBox()
    expect(t!.height, 'toggle not wrapped per glyph').toBeLessThanOrEqual(32)
  })

  test('V31-01 n=16 whole run: one main allocation, overflow frames scroll in-band with affordance and readable pointers', async ({ page }) => {
    await prep(page, 'mergeSort', desc(16))
    const overflowFrames: number[] = []
    const frames = await allFrames(page, async (b) => {
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="scene-companions"] > .scene-companions-row[data-live] .array-cells')].some(
          (c) => c.scrollWidth > c.clientWidth + 1,
        ),
      )
      if ((b.live && b.live.sh > b.live.ch + 1) || hidden) {
        overflowFrames.push(b.idx)
        expect(b.overflow, `frame ${b.idx} overflow flagged`).not.toBeNull()
        expect(b.more, `frame ${b.idx} visible scroll affordance`).toBe(true)
      }
      // every frame: each companion name and EVERY current pointer tag (i, j, …) is painted and hit-testable
      for (const e of await companionReadable(page)) {
        expect(e.frac, `frame ${b.idx} companion ${e.t} painted`).toBeGreaterThanOrEqual(0.99)
        expect(e.hit, `frame ${b.idx} companion ${e.t} hit-tests`).toBe(true)
      }
    })
    expect(frames.length).toBe(144)
    expect(new Set(frames.map((f) => f.runId)).size, 'one run, no re-solve').toBe(1)
    const pp = rectPP(frames, 'main')
    expect(Math.max(pp.x!, pp.y!, pp.w!, pp.h!), `main p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
    const cp = rectPP(frames, 'comp')
    expect(cp.h!, `band height stable ${JSON.stringify(cp)}`).toBeLessThanOrEqual(1)
    expect(Math.min(...frames.map(share)), 'main share on every frame').toBeGreaterThanOrEqual(0.55)
    expect(overflowFrames.length, 'tall left/right frames exist and take the in-band path').toBeGreaterThan(0)
  })
})
