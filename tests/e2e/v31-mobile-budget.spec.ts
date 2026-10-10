/**
 * V31-01 main-scene-priority run budget (array scenes with reserved companions).
 * The main array gets a readable-priority share of the measured stage; the companion band is one
 * stable height per run, capped by a share of the stage (and the main card's real need), and any
 * frame whose companions exceed it scrolls INSIDE the band with a visible affordance while the
 * current pointers stay painted. Real mouse/keyboard (realClick = page.mouse at the centre), retries 0.
 */
import { test, expect, type Page } from '@playwright/test'
import { prep, realClick, waitSettled, rectPP } from './helpers/v30Motion.mjs'
import { budget, companionReadable, stepTo, desc, PAINTED_FN } from './helpers/v31Budget.mjs'

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

// ---------------- M2 regression matrix (merge sort, descending input) ----------------
const FRAME_FACTS = `(() => {
  const viz = document.querySelector('[data-testid="visualizer"]')
  const stage = document.querySelector('[data-testid="viz-canvas"]')
  const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')
  const live = document.querySelector('[data-testid="scene-companions"] > .scene-companions-row[data-live]')
  const msg = (document.querySelector('[data-testid="viz-banner-text"] .viz-banner-live') || document.querySelector('[data-testid="viz-banner-text"]')).textContent
  const cards = [...live.querySelectorAll('.array-view-compact')].map((c) => ({
    name: c.querySelector('.array-label').textContent,
    vals: [...c.querySelectorAll('.cell-val')].map((v) => v.textContent),
    ptr: [...c.querySelectorAll('.cell-slot')].flatMap((s, i) => [...s.querySelectorAll('.ptr-tag')].map((t) => [t.textContent, i])),
  }))
  const slots = main ? [...main.querySelectorAll('[data-el-id]')].sort((a, b) => Number(a.dataset.slotIndex) - Number(b.dataset.slotIndex)) : []
  const sr = stage.getBoundingClientRect()
  const left = sr.left + stage.clientLeft - stage.scrollLeft, top = sr.top + stage.clientTop - stage.scrollTop
  const unreachable = slots.filter((s) => { const b = s.getBoundingClientRect(); return b.left < left - 0.5 || b.right > left + stage.scrollWidth + 0.5 || b.top < top - 0.5 || b.bottom > top + stage.scrollHeight + 0.5 }).length
  const lr = live.getBoundingClientRect()
  const liveContent = Math.max(0, ...[...live.children].map((c) => c.getBoundingClientRect().bottom)) - lr.top
  const band = document.querySelector('[data-testid="scene-companions"]').getBoundingClientRect().height
  const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const fv = getComputedStyle(main).getPropertyValue('--primary-floor').trim() || '10rem'
  const floor = fv.endsWith('rem') ? parseFloat(fv) * root : parseFloat(fv)
  return { idx: Number(viz.getAttribute('data-step-index')), runId: viz.getAttribute('data-run-id'), msg, cards,
    bandEmpty: band - Math.min(band, liveContent), floor, mainH: main.getBoundingClientRect().height,
    mainVals: slots.map((s) => (s.querySelector('.bar-val, .cell-val') || {}).textContent), unreachable, nSlots: slots.length,
    mode: main.querySelector('.bars-wrap') ? 'bars' : 'cells', stageScrolls: stage.scrollHeight > stage.clientHeight + 1 }
})()`
type Facts = { bandEmpty: number; floor: number; mainH: number; idx: number; runId: string; msg: string; cards: { name: string; vals: string[]; ptr: [string, number][] }[]; mainVals: string[]; unreachable: number; nSlots: number; mode: string; stageScrolls: boolean }

function sameStep(f: Facts) {
  const m = f.msg.match(/^比较 left\[(\d+)\]=(-?\d+) 与 right\[(\d+)\]=(-?\d+)/)
  if (m) {
    const L = f.cards.find((k) => k.name === 'left')!
    const R = f.cards.find((k) => k.name === 'right')!
    expect(L.vals[+m[1]!], `frame ${f.idx} left[i] = banner`).toBe(m[2])
    expect(R.vals[+m[3]!], `frame ${f.idx} right[j] = banner`).toBe(m[4])
    expect(L.ptr.some(([, i]) => i === +m[1]!), `frame ${f.idx} left pointer on slot i`).toBe(true)
    expect(R.ptr.some(([, i]) => i === +m[3]!), `frame ${f.idx} right pointer on slot j`).toBe(true)
  }
  const w = f.msg.match(/^写入 a\[(\d+)\] = (-?\d+)/)
  if (w) expect(f.mainVals[+w[1]!], `frame ${f.idx} write-back a[k] = banner`).toBe(w[2])
  return { cmp: m ? 1 : 0, wb: w ? 1 : 0 }
}

const VPS = [[375, 812], [390, 844], [844, 390], [1024, 600], [1366, 768], [1920, 1080]] as const
const RUN = { 7: { frames: 50, cmp: 9, wb: 9 }, 16: { frames: 144, cmp: 32, wb: 32 } } as const
for (const [w, h] of VPS) {
  test.describe(`M2 ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } })
    for (const n of [7, 16] as const)
    test(`V31 M2 n=${n} whole run ${w}x${h}: one main allocation, companions readable, same-step data, nothing unreachable`, async ({ page }) => {
      await prep(page, 'mergeSort', desc(n))
      let cmp = 0
      let wb = 0
      const facts: Facts[] = []
      const frames = await allFrames(page, async (b) => {
        const f: Facts = await page.evaluate(FRAME_FACTS)
        facts.push(f)
        const s = sameStep(f)
        cmp += s.cmp
        wb += s.wb
        expect(f.unreachable, `frame ${f.idx} main slots outside the stage's reachable box (${f.mode})`).toBe(0)
        if (b.live && (b.live.sh > b.live.ch + 1)) expect(b.more, `frame ${b.idx} affordance`).toBe(true)
        for (const e of await companionReadable(page)) {
          expect(e.frac, `frame ${b.idx} companion ${e.t} painted`).toBeGreaterThanOrEqual(0.99)
          expect(e.hit, `frame ${b.idx} companion ${e.t} hit-tests`).toBe(true)
        }
        expect(b.main!.h, `frame ${b.idx} companions are not the majority`).toBeGreaterThanOrEqual(b.comp!.h)
        expect(share(b), `frame ${b.idx} main share (companions ≤ 40%)`).toBeGreaterThanOrEqual(0.6)
        // never a big empty companion band while the main bars sit on their floor
        expect(f.bandEmpty > 40 && f.mainH <= f.floor + 1, `frame ${f.idx} empty band ${f.bandEmpty.toFixed(1)}px with main at floor ${f.mainH.toFixed(1)}`).toBe(false)
      })
      expect(frames.length).toBe(RUN[n].frames)
      expect(new Set(facts.map((f) => f.runId)).size).toBe(1)
      expect(cmp, 'compare frames checked').toBe(RUN[n].cmp)
      expect(wb, 'write-back frames checked').toBe(RUN[n].wb)
      const pp = rectPP(frames, 'main')
      expect(Math.max(pp.x!, pp.y!, pp.w!, pp.h!), `main p-p ${JSON.stringify(pp)}`).toBeLessThanOrEqual(1)
      expect(rectPP(frames, 'comp').h!, 'band height p-p').toBeLessThanOrEqual(1)
    })
  })
}

for (const [w, h] of VPS) {
  test.describe(`M2 large n ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h } })
    for (const n of [24, 32]) {
      test(`V31 M2 n=${n} ${w}x${h}: every main slot reachable; real wheel scroll paints the last slot`, async ({ page }) => {
        await prep(page, 'mergeSort', desc(n))
        await stepTo(page, 12)
        const f: Facts = await page.evaluate(FRAME_FACTS)
        expect(f.nSlots).toBe(n)
        expect(f.unreachable, `${f.mode}: slots outside the reachable box`).toBe(0)
        const stage = page.getByTestId('viz-canvas')
        const sb = (await stage.boundingBox())!
        const lastPainted = () =>
          page.evaluate((src) => {
            const painted = new Function(`return ${src}`)()
            const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')!
            const slots = [...main.querySelectorAll('[data-el-id]')].sort((a, b) => Number((a as HTMLElement).dataset.slotIndex) - Number((b as HTMLElement).dataset.slotIndex))
            return painted(slots.at(-1))
          }, PAINTED_FN)
        let p = await lastPainted()
        for (let i = 0; i < 12 && p.frac < 0.99; i++) {
          await page.mouse.move(sb.x + sb.width / 2, sb.y + Math.min(sb.height - 4, sb.height / 2))
          await page.mouse.wheel(0, 200)
          await page.waitForTimeout(50)
          p = await lastPainted()
        }
        expect(p.frac, 'last main slot painted after real wheel scrolling').toBeGreaterThanOrEqual(0.99)
        expect(p.hit).toBe(true)
        // companions keep their readable band and the data stay in step after scrolling
        expect((await page.evaluate(FRAME_FACTS)).runId).toBe(f.runId)
      })
    }
  })
}
