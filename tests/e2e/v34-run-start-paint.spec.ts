/**
 * V34: no painted layout flash when a run starts (merge sort default [5,2,8,1,9,3,7] @1366x768,
 * the V33 CI flake: 'a:slots clipped 7/7' at frame 1/55 init).
 *
 * Every animation frame from before the Run click until the stage is stable is sampled twice:
 * in requestAnimationFrame (the layout about to be painted) and in a task queued from that rAF
 * (after the frame was presented). In EVERY sample each main-array slot must be fully inside every
 * clipping ancestor, and the run's main card / plot must be ONE allocation (initial == final).
 * Retries 0: a single painted flash fails.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady, waitForStageLayoutStable } from './helpers/runReadiness'

test.describe.configure({ retries: 0 })

type Sample = { phase: string; runId: string | null; preview: string | null; mainH: number; stageH: number; maxBarH: number; slots: number; clipped: { i: number; h: number; visH: number }[]; idxHidden: number }

async function startSampler(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __v34s: { on: boolean; out: unknown[] } }
    w.__v34s = { on: true, out: [] }
    const sample = (phase: string) => {
      const stage = document.querySelector('[data-testid="viz-canvas"]')
      const view = stage ? [...stage.querySelectorAll('.array-view[data-array="a"]')].find((v) => !v.closest('.array-buffers')) : undefined
      const viz = document.querySelector('[data-testid="visualizer"]')
      const visH = (el: Element) => {
        const a = el.getBoundingClientRect()
        let t = a.top
        let b = a.bottom
        for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n)
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
            const r = n.getBoundingClientRect()
            t = Math.max(t, r.top)
            b = Math.min(b, r.bottom)
          }
        }
        return { h: a.height, visH: Math.max(0, Math.min(b, innerHeight) - Math.max(t, 0)) }
      }
      const slots = view ? [...view.querySelectorAll('[data-slot-index]')] : []
      w.__v34s.out.push({
        phase,
        runId: viz?.getAttribute('data-run-id') ?? null,
        preview: viz?.getAttribute('data-preview') ?? null,
        mainH: Math.round((view?.getBoundingClientRect().height ?? 0) * 100) / 100,
        stageH: Math.round((stage?.getBoundingClientRect().height ?? 0) * 100) / 100,
        maxBarH: Math.max(0, ...slots.map((s) => Math.round((s.querySelector('.bar')?.getBoundingClientRect().height ?? 0) * 100) / 100)),
        slots: slots.length,
        clipped: slots.map((s, i) => ({ i, ...visH(s) })).filter((x) => x.visH < x.h - 0.75).map((x) => ({ i: x.i, h: Math.round(x.h * 100) / 100, visH: Math.round(x.visH * 100) / 100 })),
        idxHidden: slots.filter((s) => { const e = s.querySelector('.bar-idx, .cell-idx'); if (!e) return true; const v = visH(e); return v.visH < v.h - 0.75 }).length,
      })
    }
    const loop = () => {
      if (!w.__v34s.on) return
      sample('raf')
      const ch = new MessageChannel()
      ch.port1.onmessage = () => sample('post-paint')
      ch.port2.postMessage(0)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}
async function stopSampler(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __v34s: { on: boolean; out: Sample[] } }
    w.__v34s.on = false
    return w.__v34s.out
  })
}

async function runAndSample(page: Page) {
  const before = await page.getByTestId('visualizer').getAttribute('data-run-id')
  await startSampler(page)
  await page.getByTestId('run-btn').click()
  await page.waitForFunction((prev) => {
    const el = document.querySelector('[data-testid="visualizer"]')
    const rid = el?.getAttribute('data-run-id')
    return el?.getAttribute('data-preview') === '0' && !!rid && rid !== 'preview' && rid !== prev
  }, before)
  const rid = (await page.getByTestId('visualizer').getAttribute('data-run-id'))!
  await waitForRunReady(page, { expectRunId: rid, minSteps: 10 })
  await waitForStageLayoutStable(page, { frames: 5 })
  const samples = await stopSampler(page)
  return { rid, samples, run: samples.filter((s) => s.runId === rid && s.preview === '0') }
}

function assertNoFlash(label: string, samples: Sample[], run: Sample[]) {
  expect(run.length, `${label}: sampled frames of the run`).toBeGreaterThan(3)
  const bad = samples.filter((s) => s.clipped.length || s.idxHidden)
  expect(bad.slice(0, 4), `${label}: painted samples with clipped slots / hidden index labels`).toEqual([])
  const mains = [...new Set(run.map((s) => s.mainH))]
  const bars = [...new Set(run.map((s) => s.maxBarH))]
  const stages = [...new Set(run.map((s) => s.stageH))]
  expect(stages, `${label}: one stage allocation per run`).toHaveLength(1)
  expect(mains, `${label}: one main-card allocation per run (initial == final)`).toHaveLength(1)
  expect(bars, `${label}: one plot height per run (initial == final)`).toHaveLength(1)
  expect(run.every((s) => s.slots === 7)).toBe(true)
}

test.describe('V34 run start paints no layout flash', () => {
  test('merge default 7 @1366x768: cold Run, then a second Run — every rAF / post-paint sample clean', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('#/')
    await page.goto('#/algo/mergeSort')
    await expect(page.getByTestId('visualizer')).toHaveAttribute('data-preview', '1')
    const first = await runAndSample(page)
    assertNoFlash('cold run', first.samples, first.run)
    await expect(page.getByTestId('step-counter')).toHaveText(/^1 \/ 55/)
    const second = await runAndSample(page)
    expect(second.rid).not.toBe(first.rid)
    assertNoFlash('second run', second.samples, second.run)
  })
})
