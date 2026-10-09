/**
 * (V30 M0) Promoted from /workspace/v30/lib — CI and independent harness share these detectors.
 * V30 shared harness + detectors. SAME detectors for product, fault-injected and baseline builds.
 * Interaction: real mouse (page.mouse at element centre, no force / no evaluate(click) /
 * no scrollIntoView) and real keyboard. Waits are state waits (rAF polling), no long sleeps.
 */
import { expect } from '@playwright/test'

export async function realClick(page, locator) {
  await expect(locator).toBeVisible()
  const b = await locator.boundingBox()
  const vp = page.viewportSize()
  if (!b) throw new Error('no box')
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  if (cx < 0 || cy < 0 || cx > vp.width || cy > vp.height) throw new Error(`target off-viewport ${cx},${cy}`)
  await page.mouse.click(cx, cy)
}

export async function prep(page, algo, arr, { mode = 'bars' } = {}) {
  await page.goto(`#/algo/${algo}`)
  const edit = page.getByTestId('input-edit-toggle')
  await expect(edit).toBeVisible({ timeout: 20_000 })
  if (((await edit.textContent()) ?? '').includes('编辑输入')) await realClick(page, edit)
  await expect(page.getByTestId('input-panel')).toHaveAttribute('data-editing', '1')
  const input = page.getByTestId('array-input')
  await realClick(page, input)
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type(arr)
  await realClick(page, page.getByTestId('run-btn'))
  await expect(page.getByTestId('play-btn')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="visualizer"]')?.getAttribute('data-preview') === '0')
  if (mode === 'cells') {
    const btn = page.locator('[data-testid="viz-canvas"] .array-view:not(.array-view-compact) .view-toggle button', { hasText: '单元格' })
    await realClick(page, btn)
    await expect(page.locator('[data-testid="viz-canvas"] .array-view:not(.array-view-compact) .array-cells')).toBeVisible()
  }
  await waitSettled(page)
}

/** In-page snapshot of everything the detectors need (one rAF frame). */
export const SNAP_SRC = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } }
  const viz = document.querySelector('[data-testid="visualizer"]')
  const main = document.querySelector('[data-testid="viz-canvas"] .array-view:not(.array-view-compact)')
  const layers = main ? [...main.querySelectorAll('[data-flip-layer]')] : []
  const els = layers.map((l) => {
    const slot = l.closest('[data-el-id]')
    const b = l.getBoundingClientRect()
    const anims = (l.getAnimations ? l.getAnimations() : []).filter((a) => a.effect && a.effect.target === l)
    const val = l.querySelector('.bar-val, .cell-val')
    const sr = slot ? slot.getBoundingClientRect() : b
    return {
      id: slot ? slot.getAttribute('data-el-id') : null,
      row: Math.round(slot && slot.classList.contains('bar-col') ? sr.bottom : sr.top),
      slot: slot ? Number(slot.getAttribute('data-slot-index')) : -1,
      x: b.x + b.width / 2, y: b.y + b.height / 2, h: b.height,
      v: val ? val.textContent : null,
      rf: l.dataset.runFlip || null,
      tid: l.dataset.transitionId || null, intent: l.dataset.actionIntent || null,
      from: l.dataset.transitionFrom || null, to: l.dataset.transitionTo || null,
      a: anims.map((a) => ({ ps: a.playState, ct: a.currentTime == null ? null : Math.round(Number(a.currentTime)), d: a.effect.getTiming().duration })),
    }
  })
  const band = (e) => Math.round(e.row / 40)
  const vis = els.slice().sort((p, q) => band(p) - band(q) || p.x - q.x)
  return {
    t: performance.now(),
    idx: viz ? Number(viz.getAttribute('data-step-index')) : -1,
    playing: viz ? viz.getAttribute('data-playing') : null,
    runId: viz ? viz.getAttribute('data-run-id') : null,
    counter: (document.querySelector('[data-testid="step-counter"]') || {}).textContent || null,
    outer: r(document.querySelector('[data-testid="workbench-viz-slot"]')),
    stage: r(document.querySelector('[data-testid="viz-canvas"]')),
    main: r(main),
    comp: r(document.querySelector('[data-testid="scene-companions"]')),
    compInner: r(document.querySelector('[data-testid="scene-companions"] > .array-buffers')),
    compKind: document.querySelector('[data-testid="scene-companions-empty"]') ? 'ghost' : (document.querySelector('[data-testid="scene-companions"] [data-testid="array-buffers"]') ? 'real' : 'none'),
    els,
    visOrder: vis.map((e) => e.v),
    visIds: vis.map((e) => e.id),
    activeAnims: els.reduce((n, e) => n + e.a.filter((a) => a.ps === 'running').length, 0),
    pausedAnims: els.reduce((n, e) => n + e.a.filter((a) => a.ps === 'paused').length, 0),
    runFlips: els.filter((e) => e.rf === '1').length,
  }
})()`

export async function snap(page) {
  return page.evaluate(SNAP_SRC)
}

export async function startSampler(page) {
  await page.evaluate((src) => {
    const fn = new Function(`return ${src}`)
    window.__v30 = { on: true, samples: [fn()] }
    const loop = () => {
      if (!window.__v30.on) return
      try { window.__v30.samples.push(fn()) } catch (e) { window.__v30.samples.push({ err: String(e) }) }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }, SNAP_SRC)
}

export async function stopSampler(page) {
  return page.evaluate(() => {
    window.__v30.on = false
    return window.__v30.samples
  })
}

export async function waitIdx(page, idx, playing) {
  await page.waitForFunction(
    ([i, p]) => {
      const v = document.querySelector('[data-testid="visualizer"]')
      if (!v) return false
      if (Number(v.getAttribute('data-step-index')) !== i) return false
      return p == null || v.getAttribute('data-playing') === p
    },
    [idx, playing],
    { polling: 'raf', timeout: 10_000 },
  )
}

/** Settled = no running/paused WAAPI on main layers, no data-run-flip and unchanged layer rects, for 3 consecutive rAFs. */
export async function waitSettled(page, timeout = 3000) {
  return page
    .waitForFunction(
      () => {
        const main = document.querySelector('[data-testid="viz-canvas"] .array-view:not(.array-view-compact)')
        if (!main) return true
        const layers = [...main.querySelectorAll('[data-flip-layer]')]
        const busy = layers.some(
          (l) => l.dataset.runFlip === '1' || (l.getAnimations?.() || []).some((a) => a.playState === 'running' || a.playState === 'paused'),
        )
        // V30 M3: also require GEOMETRY to be still (first-frame bar refit lands a frame or two
        // after the animations are idle; sampling earlier reads a transient layout).
        const sig = layers.map((l) => { const b = l.getBoundingClientRect(); return `${b.x.toFixed(1)},${b.y.toFixed(1)},${b.height.toFixed(1)}` }).join('|')
        const moved = sig !== window.__settleSig
        window.__settleSig = sig
        window.__settleN = busy || moved ? 0 : (window.__settleN || 0) + 1
        return window.__settleN >= 3
      },
      null,
      { polling: 'raf', timeout },
    )
    .then(() => true)
    .catch(() => false)
}

// ---------- detectors (pure functions over samples) ----------

/** Count frames where a moving element is strictly between its start and end x (mid-motion). */
export function midMotionFrames(samples, fromIdx = 0) {
  const s = samples.slice(fromIdx).filter((x) => x.els)
  if (s.length < 2) return { frames: 0, moved: [] }
  const first = s[0]
  const last = s[s.length - 1]
  const startX = new Map(first.els.map((e) => [e.id, e.x]))
  const endX = new Map(last.els.map((e) => [e.id, e.x]))
  const moved = [...endX.keys()].filter((id) => startX.has(id) && Math.abs(startX.get(id) - endX.get(id)) > 4)
  let frames = 0
  for (const smp of s) {
    const mid = smp.els.some((e) => {
      if (!moved.includes(e.id)) return false
      const a = startX.get(e.id)
      const b = endX.get(e.id)
      const lo = Math.min(a, b) + 1
      const hi = Math.max(a, b) - 1
      return e.x > lo && e.x < hi
    })
    if (mid) frames++
  }
  return { frames, moved, startX: Object.fromEntries(startX), endX: Object.fromEntries(endX) }
}

/** Max |dy| over samples for same-row moving elements (pure horizontal). */
export function maxVerticalDrift(samples) {
  const s = samples.filter((x) => x.els)
  if (!s.length) return 0
  const y0 = new Map(s[0].els.map((e) => [e.id, e.y]))
  let m = 0
  for (const smp of s) for (const e of smp.els) if (y0.has(e.id)) m = Math.max(m, Math.abs(e.y - y0.get(e.id)))
  return m
}

/** Peak-to-peak of a rect key over samples (x/y/w/h). */
export function rectPP(samples, key) {
  const out = {}
  for (const k of ['x', 'y', 'w', 'h']) {
    const vals = samples.map((s) => s[key]?.[k]).filter((v) => typeof v === 'number')
    out[k] = vals.length ? Math.max(...vals) - Math.min(...vals) : null
  }
  return out
}

export function frozenAtStart(sample) {
  return sample.els.flatMap((e) => e.a.filter((a) => a.ps === 'paused' && (a.ct ?? 0) <= 1).map((a) => ({ id: e.id, ...a })))
}

/** Pre-measured real-mouse target (for clicks that must land within a ~280ms transition). */
export async function boxOf(page, locator) {
  await expect(locator).toBeVisible()
  const b = await locator.boundingBox()
  if (!b) throw new Error('no box')
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
export async function clickBox(page, p) {
  await page.mouse.click(p.x, p.y)
}
/** Wait until a main-array WAAPI transition is running with currentTime > minCt. */
export async function waitRunning(page, minCt = 20, timeout = 10_000) {
  await page.waitForFunction(
    (m) =>
      [...document.querySelectorAll('[data-testid="viz-canvas"] .array-view:not(.array-view-compact) [data-flip-layer]')].some((l) =>
        (l.getAnimations?.() || []).some((a) => a.playState === 'running' && Number(a.currentTime) > m),
      ),
    minCt,
    { polling: 'raf', timeout },
  )
}

/** Max per-frame displacement of any element (by id) across consecutive samples — catches snaps. */
export function maxFrameJump(samples) {
  let m = 0
  for (let i = 1; i < samples.length; i++) {
    const prev = new Map((samples[i - 1].els || []).map((e) => [e.id, e.x]))
    for (const e of samples[i].els || []) if (prev.has(e.id)) m = Math.max(m, Math.abs(e.x - prev.get(e.id)))
  }
  return m
}
