/**
 * V31 (main-scene-priority companion budget) — shared measurement helpers.
 * Real mouse only (realClick from v30Motion: page.mouse at the element centre, no force, no
 * evaluate(click), no scrollIntoView). Measurements read REAL painted rects: an element counts as
 * readable only if its box survives every clipping ancestor and the viewport and hit-tests to itself.
 */
import { expect } from '@playwright/test'
import { realClick, waitIdx, waitSettled } from './v30Motion.mjs'

export const BUDGET_SRC = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } }
  const viz = document.querySelector('[data-testid="visualizer"]')
  const stage = document.querySelector('[data-testid="viz-canvas"]')
  const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')
  const comp = document.querySelector('[data-testid="scene-companions"]')
  const live = comp && comp.querySelector(':scope > .scene-companions-row[data-live]')
  const bars = main ? [...main.querySelectorAll('.bar')].map((b) => b.getBoundingClientRect().height) : []
  const more = comp && comp.querySelector('[data-testid="scene-companions-more"]')
  const moreVis = more ? getComputedStyle(more).visibility !== 'hidden' && getComputedStyle(more).display !== 'none' && more.getBoundingClientRect().height > 0 : false
  return {
    idx: viz ? Number(viz.getAttribute('data-step-index')) : -1,
    runId: viz ? viz.getAttribute('data-run-id') : null,
    counter: (document.querySelector('[data-testid="step-counter"]') || {}).textContent || null,
    stage: r(stage), stageClientH: stage ? stage.clientHeight : 0, stageScrollH: stage ? stage.scrollHeight : 0,
    comp: r(comp), budget: comp ? comp.getAttribute('data-budget') : null,
    live: live ? { sh: live.scrollHeight, ch: live.clientHeight, st: live.scrollTop, ov: getComputedStyle(live).overflowY } : null,
    overflow: comp ? comp.getAttribute('data-overflow') : null,
    more: moreVis,
    main: r(main), mode: main ? (main.querySelector('.bars-wrap') ? 'bars' : 'cells') : null,
    maxBar: bars.length ? Math.max(...bars) : 0,
    nBars: bars.length,
  }
})()`

export const budget = (page) => page.evaluate(BUDGET_SRC)

/** Visible fraction of el's painted box after all clipping ancestors + viewport, and hit-test at its centre. */
export const PAINTED_FN = `(el) => {
  if (!el) return { frac: 0, hit: false }
  const b = el.getBoundingClientRect()
  let L = Math.max(0, b.left), T = Math.max(0, b.top), R = Math.min(innerWidth, b.right), B = Math.min(innerHeight, b.bottom)
  for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const cs = getComputedStyle(a)
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.contain.includes('paint')) {
      const ab = a.getBoundingClientRect()
      const cl = ab.left + a.clientLeft, ct = ab.top + a.clientTop
      L = Math.max(L, cl); T = Math.max(T, ct); R = Math.min(R, cl + a.clientWidth); B = Math.min(B, ct + a.clientHeight)
    }
  }
  const area = Math.max(0, R - L) * Math.max(0, B - T)
  const frac = b.width * b.height > 0 ? area / (b.width * b.height) : 0
  let hit = false
  if (area > 0) { const h = document.elementFromPoint((L + R) / 2, (T + B) / 2); hit = !!h && (h === el || el.contains(h) || h.contains(el)) }
  return { frac, hit }
}`

/** Painted readability of every pointer tag / highlighted cell inside the live companion row. */
export async function companionReadable(page) {
  return page.evaluate((src) => {
    const painted = new Function(`return ${src}`)()
    const live = document.querySelector('[data-testid="scene-companions"] > .scene-companions-row[data-live]')
    if (!live) return []
    const els = [...live.querySelectorAll('.array-view-compact .ptr-tag, .array-view-compact .array-label')]
    return els.map((e) => ({ t: e.textContent, ...painted(e) }))
  }, PAINTED_FN)
}

export async function stepTo(page, idx) {
  const next = page.getByTestId('next-step-btn')
  for (;;) {
    const cur = await page.evaluate(() => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')))
    if (cur >= idx) break
    await expect(next).toBeEnabled()
    await realClick(page, next)
    await waitIdx(page, cur + 1)
  }
  await waitSettled(page)
}

export const desc = (n) => Array.from({ length: n }, (_, i) => n - i).join(',')
