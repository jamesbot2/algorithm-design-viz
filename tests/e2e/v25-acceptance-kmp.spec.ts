/**
 * V25 acceptance: KMP (three stage arrays text / pattern / next) in the full app.
 * Reproduced defects: at 1366×768 the legacy primary-first panel squeezed every array
 * into an overflow:hidden box — cells, values and the i / j pointers were cut off with no
 * scroller to reach them; several frames showed「未映射」although the document contains
 * the executed statement. Real clicks / wheel only; no force, no evaluate(click), no
 * pre-emptive scrollIntoView, retries 0. Reuses the V24 object detector (primaryObjects).
 */
import { test, expect, type Page } from '@playwright/test'
import { waitForRunReady } from './helpers/runReadiness'
import { measureStageObjects, MAIN_ARRAY_GROUPS, notFullyVisible } from './helpers/primaryObjects'
import { generateSteps as kmpSteps } from '../../src/algorithms/kmp'
import { getCatalog } from '../../src/codeCatalog'
import { pickPrimaryCodeRef } from '../../src/utils/codeRefs'

if (process.env.V25_BASE) test.use({ baseURL: process.env.V25_BASE })
test.describe.configure({ retries: 0 })

const ARRAYS = ['text', 'pattern', 'next'] as const
const stepIdx = async (page: Page) => Number(await page.getByTestId('visualizer').getAttribute('data-step-index'))

async function openAndRun(page: Page) {
  await page.goto('#/')
  await page.goto('#/algo/kmp')
  await expect(page.getByTestId('workbench-layout')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('run-btn').click()
  await waitForRunReady(page, { minSteps: 33 })
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
/** Objects that are never fully visible: at rest, then while wheeling the stage (normal scrolling). */
async function unreachable(page: Page) {
  const seen = new Set<string>()
  const all = new Set<string>()
  const take = async () => {
    for (const a of ARRAYS) {
      const m = await measureStageObjects(page, MAIN_ARRAY_GROUPS(a))
      for (const [g, list] of Object.entries(m.groups))
        list.forEach((o, i) => {
          all.add(`${a}.${g}#${i}`)
          if (o.full) seen.add(`${a}.${g}#${i}`)
        })
    }
  }
  await take()
  const box = await page.getByTestId('viz-canvas').boundingBox()
  if (box && [...all].some((k) => !seen.has(k))) {
    await page.mouse.move(box.x + 40, box.y + box.height / 2)
    // a reader scrolls the stage both ways (it may still be scrolled from an earlier frame)
    for (const dy of [-120, -120, -120, -120, 120, 120, 120, 120, 120, 120]) {
      await page.mouse.wheel(0, dy)
      await page.waitForTimeout(150)
      await take()
    }
  }
  return [...all].filter((k) => !seen.has(k))
}

for (const vp of [
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
  { w: 844, h: 390 },
]) {
  test(`KMP text/pattern/next cells, values and i/j pointers reachable @${vp.w}x${vp.h}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await openAndRun(page)
    const FRAMES = [2, 13, 18, 33]
    if (vp.w >= 1366 && vp.h >= 768) {
      // at rest (no user scrolling yet): 1920 shows all three arrays; 1366 shows at least the
      // two arrays carrying the i / j / len pointers (next may need the stage scroll)
      const must = vp.w >= 1920 ? ARRAYS : (['text', 'pattern'] as const)
      for (const f of FRAMES) {
        await seek(page, f - 1)
        for (const a of must) {
          const m = await measureStageObjects(page, MAIN_ARRAY_GROUPS(a))
          for (const [g, list] of Object.entries(m.groups)) expect(notFullyVisible(list).length, `f${f} ${a}.${g} clipped at rest`).toBe(0)
        }
      }
    }
    // every object of every array is reachable with ordinary stage scrolling
    for (const f of FRAMES) {
      await seek(page, f - 1)
      const miss = await unreachable(page)
      expect(miss, `frame ${f}: never fully visible: ${miss.join(', ')}`).toEqual([])
    }
  })
}

test('KMP every frame shows a mapped statement that matches the frame (1366×768)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await openAndRun(page)
  const frames = kmpSteps([])
  const doc = getCatalog('kmp')!.typescript
  const L = doc.source.split('\n')
  expect(frames).toHaveLength(33)
  for (let k = 0; k < frames.length; k++) {
    if (k > 0) {
      await page.getByTestId('next-step-btn').click()
      await expect.poll(() => stepIdx(page)).toBe(k)
    }
    const e = await page.evaluate(() => ({
      unmapped: !!document.querySelector('[data-testid="code-unmapped"]'),
      line: Number(document.querySelector('[data-testid="code-mirror-wrap"]')?.getAttribute('data-exec-line') || 0),
      banner: document.querySelector('[data-testid="viz-banner-text"]')?.textContent?.trim() ?? '',
    }))
    const a = doc.anchors.find((x) => x.id === pickPrimaryCodeRef(frames[k]!)!.anchorId)!
    expect(e.banner).toBe(frames[k]!.message)
    expect(e.unmapped, `frame ${k + 1} "${e.banner}" unmapped`).toBe(false)
    expect(e.line, `frame ${k + 1} "${e.banner}"`).toBe(a.range.startLine)
    expect(L[e.line - 1]!.trim().startsWith('export function'), 'never the declaration').toBe(false)
  }
})
