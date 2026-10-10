// V31 measurement harness: real mouse/keyboard only (page.mouse at element centre, keyboard typing).
import { chromium } from '@playwright/test'
export const MEASURE_SRC = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), bottom: +b.bottom.toFixed(2) } }
  const viz = document.querySelector('[data-testid="visualizer"]')
  const stage = document.querySelector('[data-testid="viz-canvas"]')
  const main = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view') || document.querySelector('[data-testid="viz-canvas"] .array-view:not(.array-view-compact)')
  const comp = document.querySelector('[data-testid="scene-companions"]')
  const bars = main ? [...main.querySelectorAll('.bar')].map((b) => b.getBoundingClientRect().height) : []
  const bw = main ? main.querySelector('.bars-wrap') : null
  const live = comp ? comp.querySelector('.scene-companions-row[data-live]') : null
  const aux = document.querySelector('[data-testid="viz-canvas"] .aux-toggle')
  return {
    idx: viz ? Number(viz.getAttribute('data-step-index')) : -1,
    runId: viz ? viz.getAttribute('data-run-id') : null,
    counter: (document.querySelector('[data-testid="step-counter"]') || {}).textContent || null,
    banner: ((document.querySelector('[data-testid="viz-banner"]') || {}).textContent || '').slice(0, 80),
    stage: r(stage), stageClientH: stage ? stage.clientHeight : null, stageScrollH: stage ? stage.scrollHeight : null,
    comp: r(comp), compBudget: comp ? comp.getAttribute('data-budget') : null, compMode: comp ? comp.getAttribute('data-mode') : null,
    compScroll: live ? { sh: live.scrollHeight, ch: live.clientHeight } : null,
    main: r(main), maxBar: bars.length ? +Math.max(...bars).toFixed(2) : null, barsWrap: r(bw), nBars: bars.length,
    tree: aux ? aux.getAttribute('aria-pressed') : null,
    vp: { w: innerWidth, h: innerHeight },
  }
})()`
export async function launch() {
  return chromium.launch({ executablePath: '/usr/bin/google-chrome' })
}
export async function realClick(page, loc) {
  await loc.waitFor({ state: 'visible' })
  const b = await loc.boundingBox()
  const vp = page.viewportSize()
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2
  if (cx < 0 || cy < 0 || cx > vp.width || cy > vp.height) throw new Error(`off-viewport ${cx},${cy}`)
  await page.mouse.click(cx, cy)
}
export async function prep(page, base, algo, arr) {
  await page.goto(`${base}#/algo/${algo}`)
  const edit = page.getByTestId('input-edit-toggle')
  await edit.waitFor({ state: 'visible', timeout: 20000 })
  if (((await edit.textContent()) ?? '').includes('编辑输入')) await realClick(page, edit)
  const input = page.getByTestId('array-input')
  await realClick(page, input)
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type(arr)
  await realClick(page, page.getByTestId('run-btn'))
  await page.getByTestId('play-btn').waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview') === '0')
}
export async function settle(page) {
  await page.waitForFunction(() => {
    const ls = [...document.querySelectorAll('[data-testid="viz-canvas"] [data-flip-layer]')]
    const busy = ls.some((l) => l.dataset.runFlip === '1' || (l.getAnimations?.() || []).some((a) => a.playState === 'running' || a.playState === 'paused'))
    const sig = ls.map((l) => { const b = l.getBoundingClientRect(); return `${b.x.toFixed(1)},${b.y.toFixed(1)},${b.height.toFixed(1)}` }).join('|') + '|' + (document.querySelector('[data-testid="scene-companions"]')?.getBoundingClientRect().height ?? 0)
    const moved = sig !== window.__s; window.__s = sig
    window.__n = busy || moved ? 0 : (window.__n || 0) + 1
    return window.__n >= 3
  }, null, { polling: 'raf', timeout: 5000 }).catch(() => {})
}
export async function stepTo(page, idx) {
  const next = page.getByTestId('next-step-btn')
  for (;;) {
    const cur = await page.evaluate(() => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')))
    if (cur >= idx) break
    await realClick(page, next)
    await page.waitForFunction((i) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === i, cur + 1, { polling: 'raf', timeout: 10000 })
  }
  await settle(page)
}
export const measure = (page) => page.evaluate(MEASURE_SRC)
