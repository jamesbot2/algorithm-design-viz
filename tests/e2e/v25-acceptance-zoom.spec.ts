/**
 * V25 acceptance (follow-up): short stages as produced by Chrome page zoom on a ~1280×655 window.
 * APPROXIMATION of browser zoom: CSS viewport W/Z × H/Z with deviceScaleFactor Z
 * (125% ≈ 1024×524@1.25, 150% ≈ 853×437@1.5, 200% ≈ 640×328@2) plus 640×328@1.
 * Real zoom is judged separately in real Chrome.
 *
 * Reproduced on the live V25 build (2d68e1c) at the 200%-equivalent: Kadane frame 7's signed plot
 * was squashed to the 32px floor inside an overflow:hidden array-view; the index track and the
 * pointer track were cut off and could not be reached by scrolling the stage.
 * Contract: the signed plot keeps a readable span (≥ SIGNED_MIN_SPAN_PX) and when the stage is
 * shorter than the chart the STAGE scrolls — every bar, value, index and pointer becomes fully
 * visible at some position of normal wheel scrolling over the stage; value labels follow the
 * V25 short-bar rule (inside → within its own bar, tip/across → label line box never on its own
 * bar body) and
 * never collide (measureSignedAnnotations). KMP text / pattern / next values, indices and
 * pointers must be reachable the same way.
 * Real mouse wheel only; no force, no evaluate(click), no scrollIntoView; retries 0.
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureStageObjects, MAIN_ARRAY_GROUPS, measureSignedAnnotations, signedAnnotationFailures } from './helpers/primaryObjects'
import { SIGNED_MIN_SPAN_PX } from '../../src/components/signedPlot'

if (process.env.V25_BASE) test.use({ baseURL: process.env.V25_BASE })
test.describe.configure({ retries: 0 })

const VPS = [
  { name: '125%≈1024x524@1.25', w: 1024, h: 524, dpr: 1.25 },
  { name: '150%≈853x437@1.5', w: 853, h: 437, dpr: 1.5 },
  { name: '200%≈640x328@2', w: 640, h: 328, dpr: 2 },
  { name: '640x328@1', w: 640, h: 328, dpr: 1 },
]
const stepIdx = async (page: Page) => Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))

async function openAndRun(page: Page, algo: string, minSteps: number) {
  await page.goto('#/')
  await page.goto(`#/algo/${algo}`)
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('run-btn').click()
  await waitForRunReady(page, { minSteps })
  const tab = page.getByTestId('workbench-tab-demo')
  if (await tab.isVisible()) await tab.click()
}
async function seek(page: Page, idx: number) {
  await page.getByRole('slider', { name: '步骤进度' }).fill(String(idx))
  await expect.poll(() => stepIdx(page)).toBe(idx)
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('[data-testid="viz-canvas"] [data-run-flip="1"]').length))
    .toBe(0)
  await page.waitForTimeout(320)
}
/**
 * Objects never fully visible over the stage's whole wheel range (40px real-wheel steps over the
 * stage until its scrollTop stops moving). `slots` is not required: at 200% the stage is shorter
 * than one column, so a whole column can never be on screen at once — its parts must be.
 */
async function unreachable(page: Page, arrays: string[], groups = ['bars', 'values', 'indices', 'pointers']) {
  const seen = new Set<string>()
  const all = new Set<string>()
  const take = async () => {
    for (const a of arrays) {
      const m = await measureStageObjects(page, MAIN_ARRAY_GROUPS(a))
      for (const g of groups)
        (m.groups[g] ?? []).forEach((o, i) => {
          all.add(`${a}.${g}#${i}`)
          if (o.full) seen.add(`${a}.${g}#${i}`)
        })
    }
  }
  const stage = page.getByTestId('viz-canvas')
  const box = (await stage.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 30))
  await take()
  let last = -1
  let same = 0
  for (let k = 0; k < 80 && same < 2; k++) {
    await page.mouse.wheel(0, 40)
    await page.waitForTimeout(90)
    await take()
    const t = await stage.evaluate((e) => e.scrollTop)
    same = t === last ? same + 1 : 0
    last = t
  }
  return [...all].filter((k) => !seen.has(k))
}

for (const vp of VPS) {
  test.describe(`zoom ${vp.name}`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: vp.dpr })

    test(`Kadane frame 7 signed plot readable + tracks reachable @${vp.name}`, async ({ page }) => {
      await openAndRun(page, 'kadane', 22)
      await seek(page, 6)
      await expect(page.getByTestId('viz-banner-text')).toHaveText(/考察 a\[3\] = 4/)
      const span = await page
        .locator('[data-testid="viz-canvas"] .array-view[data-array="a"] .bars-wrap')
        .evaluate((w) => parseFloat(getComputedStyle(w).getPropertyValue('--plot-span')))
      expect(span, 'signed plot span').toBeGreaterThanOrEqual(SIGNED_MIN_SPAN_PX)
      const sig = await measureSignedAnnotations(page, 'a')
      expect(signedAnnotationFailures(sig)).toEqual([])
      // V25 short-bar label rule against the label's OWN bar (Range glyph vs bar box)
      const own = await page.evaluate(() => {
        const view = document.querySelector('[data-testid="viz-canvas"] .array-view[data-array="a"]')!
        const bad: string[] = []
        for (const s of view.querySelectorAll('[data-slot-index]')) {
          const bar = s.querySelector('.bar')
          const val = s.querySelector('.bar-val')
          if (!bar || !val) continue
          const pos = bar.getAttribute('data-label-pos') ?? s.getAttribute('data-label-pos')
          // Label box = the .bar-val line box (line-height 1 → one em). A text Range here is the
          // font's ascent+descent box (14px for a 10.9px mono face) and reports ~1px of phantom
          // overlap where the screenshot shows a clear ink gap (Range rect ≠ glyph ink).
          const lb = val.getBoundingClientRect()
          const gt = lb.top
          const gb = lb.bottom
          const b = bar.getBoundingClientRect()
          const dy = Math.min(gb, b.bottom) - Math.max(gt, b.top)
          if (pos === 'inside' && (gt < b.top - 0.5 || gb > b.bottom + 0.5)) bad.push(`inside label outside bar @${s.getAttribute('data-slot-index')}`)
          if ((pos === 'tip' || pos === 'across') && dy > 0.5) bad.push(`${pos} label on own bar @${s.getAttribute('data-slot-index')} dy=${dy.toFixed(1)}`)
        }
        return bad
      })
      expect(own).toEqual([])
      expect(await unreachable(page, ['a'])).toEqual([])
    })

    test(`KMP frames 3/4/13 values/indices/pointers reachable @${vp.name}`, async ({ page }) => {
      await openAndRun(page, 'kmp', 33)
      for (const f of [3, 4, 13]) {
        await seek(page, f - 1)
        const stage = page.getByTestId('viz-canvas')
        const box = (await stage.boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 30))
        for (let k = 0; k < 30; k++) await page.mouse.wheel(0, -200)
        await page.waitForTimeout(200)
        expect(await unreachable(page, ['text', 'pattern', 'next'], ['values', 'indices', 'pointers']), `frame ${f}`).toEqual([])
      }
    })
  })
}
