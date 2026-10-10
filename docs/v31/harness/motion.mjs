// Mid-animation record: rAF sampler of the main card + band rects while real Next clicks play each step's motion (not settled between clicks except for the step index).
import { launch, prep, realClick, settle } from './measure.mjs'
const [base, ver] = process.argv.slice(2)
const browser = await launch()
for (const [vw, vh, n] of [[375, 812, 16], [844, 390, 16], [375, 812, 7], [1366, 768, 24]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } })
  await prep(page, base, 'mergeSort', Array.from({ length: n }, (_, i) => n - i).join(','))
  await settle(page)
  await page.evaluate(() => { window.__smp = []; window.__on = true
    const tick = () => { if (!window.__on) return
      const m = document.querySelector('[data-testid="viz-canvas"] .arrays-panel[data-declared-primary] > .array-view')?.getBoundingClientRect()
      const c = document.querySelector('[data-testid="scene-companions"]')?.getBoundingClientRect()
      const busy = [...document.querySelectorAll('[data-testid="viz-canvas"] [data-flip-layer]')].some((l) => l.dataset.runFlip === '1' || (l.getAnimations?.() || []).some((a) => a.playState === 'running'))
      if (m) window.__smp.push([m.x, m.y, m.width, m.height, c ? c.height : 0, busy ? 1 : 0])
      requestAnimationFrame(tick) }
    requestAnimationFrame(tick) })
  const next = page.getByTestId('next-step-btn')
  let steps = 0
  for (let i = 1; i < 400; i++) {
    if (await next.isDisabled()) break
    await realClick(page, next); steps++
    await page.waitForFunction((k) => Number(document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-step-index')) === k, i, { polling: 'raf' })
    await page.waitForTimeout(120) // mid-motion: next click lands while the previous step is still animating on many frames
  }
  await settle(page)
  const s = await page.evaluate(() => { window.__on = false; return window.__smp })
  const pp = (j, f = () => true) => { const v = s.filter(f).map((r) => r[j]); return v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(2) : null }
  const busy = (r) => r[5] === 1
  console.log(JSON.stringify({ ver, vp: `${vw}x${vh}`, n, steps, samples: s.length, busySamples: s.filter(busy).length,
    mainPP_all: { x: pp(0), y: pp(1), w: pp(2), h: pp(3) }, mainPP_midMotion: { x: pp(0, busy), y: pp(1, busy), w: pp(2, busy), h: pp(3, busy) }, bandPP_all: pp(4), bandPP_midMotion: pp(4, busy) }))
  await page.close()
}
await browser.close()
