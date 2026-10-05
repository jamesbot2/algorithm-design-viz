/**
 * V29 M4 shared detectors — SAME functions for positive and negative controls.
 * Faults are injected into the live DOM; detectors never branch on fault names.
 */

export const FRAME_DH_MAX = 8
export const FRAME_DY_MAX = 2
export const BOUNCE_SCALE_EPS = 0.02

/** @param {import('@playwright/test').Page} page */
export async function sampleWorkbench(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const pack = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const viz = q('[data-testid="visualizer"]')
    return {
      t: performance.now(),
      runId: viz?.getAttribute('data-run-id') ?? null,
      step: viz?.getAttribute('data-step-index') ?? null,
      cursor: q('[data-testid="step-counter"]')?.textContent?.trim() ?? null,
      scene: pack(q('[data-testid="workbench-viz-slot"]')),
      primary: pack(q('.arrays-panel .array-view:not(.array-view-compact), [data-testid="viz-canvas"] .array-view:not(.array-view-compact)')),
      barsWrap: pack(q('.array-view:not(.array-view-compact) .bars-wrap')),
      data: pack(q('[data-testid="workbench-data-slot"]')),
      dataBody: pack(q('[data-testid="workbench-data-body"]')),
    }
  })
}

/** Frame stability: scene/primary must not jump in y/h between two samples. */
export function checkFrameStability(a, b, opts = {}) {
  const dhMax = opts.dhMax ?? FRAME_DH_MAX
  const dyMax = opts.dyMax ?? FRAME_DY_MAX
  const fails = []
  for (const key of ['scene', 'primary']) {
    const x = a?.[key]
    const y = b?.[key]
    if (!x || !y) {
      fails.push(`${key}:missing`)
      continue
    }
    const dy = Math.abs(y.y - x.y)
    const dh = Math.abs(y.h - x.h)
    if (dy > dyMax) fails.push(`${key}:dy=${dy.toFixed(2)}>${dyMax}`)
    if (dh > dhMax) fails.push(`${key}:dh=${dh.toFixed(2)}>${dhMax}`)
  }
  return { ok: fails.length === 0, fails, a, b }
}

/** Max |scale-1| from matrix(a,...) on flip layers / bars. */
export async function sampleScaleBounce(page) {
  return page.evaluate(() => {
    const read = (el) => {
      const tr = getComputedStyle(el).transform
      if (!tr || tr === 'none') return 1
      const m = tr.match(/matrix\(([^)]+)\)/)
      if (!m) return 1
      const p = m[1].split(',').map(Number)
      // matrix(a,b,c,d,e,f) — uniform-ish scale from a,d
      return Math.max(Math.abs(p[0] || 1), Math.abs(p[3] || 1))
    }
    const els = [
      ...document.querySelectorAll('.bar-flip-layer, .bar.hl-swap, .bar.hl-update, .cell.hl-swap, .cell.hl-update'),
    ]
    const scales = els.map(read)
    const peak = scales.length ? Math.max(...scales.map((s) => Math.abs(s - 1))) : 0
    const animNames = els.map((el) => getComputedStyle(el).animationName).filter((n) => n && n !== 'none')
    return { peak, scales: scales.slice(0, 12), animNames: [...new Set(animNames)].slice(0, 8) }
  })
}

export function checkNoBounce(sample, eps = BOUNCE_SCALE_EPS) {
  const fails = []
  if (sample.peak > eps) fails.push(`scalePeak=${sample.peak.toFixed(3)}>${eps}`)
  const badAnim = (sample.animNames || []).filter((n) => /bounce|spring|elastic|overshoot|chip-flash|arr-update-settle/i.test(n) && /scale/i.test(n))
  // settle is paint-only now; flag only if peak already bad
  return { ok: fails.length === 0, fails, sample }
}

/** Mid-path authenticity: while swap running, collect tx samples; need continuous motion. */
export async function sampleFlipMotion(page, ms = 180) {
  return page.evaluate(async (ms) => {
    const frames = []
    const t0 = performance.now()
    while (performance.now() - t0 < ms) {
      const layers = [...document.querySelectorAll('.bar-flip-layer')]
      const active = layers
        .map((el) => {
          const anims = el.getAnimations?.() || []
          const a = anims.find((x) => x.playState === 'running' || x.playState === 'paused')
          const tr = getComputedStyle(el).transform
          let tx = 0
          const m = tr && tr.match(/matrix\(([^)]+)\)/)
          if (m) tx = Number(m[1].split(',')[4])
          return {
            runFlip: el.dataset.runFlip || null,
            tid: el.dataset.transitionId || null,
            playState: a?.playState || null,
            currentTime: a?.currentTime ?? null,
            tx,
          }
        })
        .filter((r) => r.playState || Math.abs(r.tx) > 0.5 || r.runFlip === '1')
      frames.push({ t: performance.now() - t0, active })
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    }
    return frames
  }, ms)
}

export function checkMidMotionAuthenticity(frames) {
  const fails = []
  const withMotion = frames.filter((f) => f.active.some((a) => Math.abs(a.tx) > 0.5 || a.playState === 'running'))
  if (withMotion.length < 2) fails.push(`motionFrames=${withMotion.length}<2`)
  const txs = withMotion.flatMap((f) => f.active.map((a) => a.tx)).filter((x) => Math.abs(x) > 0.5)
  const bins = new Set(txs.map((x) => Math.round(x / 5) * 5))
  if (txs.length >= 3 && bins.size < 2) fails.push(`teleport:uniqBins=${bins.size}`)
  // Must not be all zeros / all teleports to end only
  return { ok: fails.length === 0, fails, motionFrames: withMotion.length, uniqBins: bins.size, txs: txs.slice(0, 16) }
}

/** After seek/reset: no active WAAPI, transform identity/none, optional stale tid ignored. */
export async function sampleCancelCleanup(page) {
  return page.evaluate(() => {
    const layers = [...document.querySelectorAll('.bar-flip-layer')]
    return layers.map((el) => {
      const anims = (el.getAnimations?.() || []).filter((a) => a.playState === 'running' || a.playState === 'paused')
      const tr = getComputedStyle(el).transform
      return {
        tid: el.dataset.transitionId || null,
        runFlip: el.dataset.runFlip || null,
        transform: tr,
        activeAnims: anims.length,
        inline: el.style.transform || '',
      }
    })
  })
}

export function checkCancelCleanup(rows) {
  const fails = []
  for (const r of rows) {
    if (r.activeAnims > 0) fails.push(`activeAnims=${r.activeAnims}`)
    if (r.runFlip === '1') fails.push('runFlipStillSet')
    const okTr =
      !r.transform ||
      r.transform === 'none' ||
      r.transform === 'matrix(1, 0, 0, 1, 0, 0)'
    if (!okTr) fails.push(`transform=${r.transform}`)
    if (r.inline && r.inline !== 'none' && r.inline !== '' && r.inline !== 'translate(0px, 0px)') {
      // allow empty
      if (/translate\([^0]/.test(r.inline) || /translate\(-?[1-9]/.test(r.inline)) fails.push(`inline=${r.inline}`)
    }
  }
  return { ok: fails.length === 0, fails, rows }
}

/**
 * Primary array glyph visibility vs data panel — same clip∩viewport rule as V24
 * (simplified, bars/cells in viz-canvas / arrays-panel primary).
 */
export async function samplePrimaryVisibility(page) {
  return page.evaluate(() => {
    const tol = 0.75
    const stage =
      [...document.querySelectorAll('[data-testid="viz-canvas"]')].find(
        (s) => !s.closest('[inert],[aria-hidden="true"],[hidden]'),
      ) || document.querySelector('.arrays-panel .array-view:not(.array-view-compact)')
    const clip = (el) => {
      const a = el.getBoundingClientRect()
      let t = a.top
      let b = a.bottom
      let l = a.left
      let r = a.right
      let n = el.parentElement
      let invisible = false
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) invisible = true
        if ([cs.overflowX, cs.overflowY].some((o) => o !== 'visible')) {
          const nr = n.getBoundingClientRect()
          t = Math.max(t, nr.top)
          b = Math.min(b, nr.bottom)
          l = Math.max(l, nr.left)
          r = Math.min(r, nr.right)
        }
        n = n.parentElement
      }
      t = Math.max(t, 0)
      l = Math.max(l, 0)
      b = Math.min(b, window.innerHeight)
      r = Math.min(r, window.innerWidth)
      const visW = invisible ? 0 : Math.max(0, r - l)
      const visH = invisible ? 0 : Math.max(0, b - t)
      const full = a.width > 0 && a.height > 0 && visW >= a.width - tol && visH >= a.height - tol
      return { full, visH, elH: a.height, text: (el.textContent || '').trim().slice(0, 24) }
    }
    const root = stage || document
    const bars = [...root.querySelectorAll('.bar, .cell')].filter((el) => {
      if (el.closest('.array-view-compact, [data-testid="workbench-data-slot"]')) return false
      return true
    })
    const glyphs = bars.slice(0, 24).map(clip)
    const dataOk = (() => {
      const d = document.querySelector('[data-testid="workbench-data-body"], [data-testid="workbench-data-slot"]')
      if (!d) return true
      const r = d.getBoundingClientRect()
      return r.width > 40 && r.height > 20
    })()
    return {
      total: glyphs.length,
      full: glyphs.filter((g) => g.full).length,
      glyphs,
      dataOk,
    }
  })
}

export function checkPrimaryVisibility(sample, minFullRatio = 0.85) {
  const fails = []
  if (sample.total === 0) fails.push('noPrimaryGlyphs')
  else if (sample.full / sample.total < minFullRatio) {
    fails.push(`primaryClipped:${sample.full}/${sample.total}`)
  }
  // data table OK is context for the negative (clipped primary but data fine) — not a pass requirement alone
  return { ok: fails.length === 0, fails, sample }
}

/* ─── Fault injectors (cleared by clearAllFaults) ─── */

export async function injectFrameFault(page, dy = 4) {
  await page.evaluate((dy) => {
    const el = document.querySelector('[data-testid="workbench-viz-slot"]')
    if (!el) return
    el.setAttribute('data-v29-fault', 'frame')
    el.style.transform = `translateY(${dy}px)`
  }, dy)
}

export async function injectBounceFault(page) {
  await page.evaluate(() => {
    if (document.getElementById('v29-fault-bounce')) return
    const s = document.createElement('style')
    s.id = 'v29-fault-bounce'
    s.textContent = `
      @keyframes v29-fault-bounce {
        0%, 100% { transform: scale(1); }
        40% { transform: scale(1.18); }
      }
      .bar, .bar-flip-layer, .cell {
        animation: v29-fault-bounce 400ms cubic-bezier(0.34, 1.56, 0.64, 1) infinite !important;
      }
    `
    document.head.appendChild(s)
    document.documentElement.setAttribute('data-v29-fault', 'bounce')
  })
}

/** Kill in-flight swap motion and block new WAAPI — mid-motion authenticity must fail. */
export async function injectNoSwapTransitionFault(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-v29-fault', 'noswap')
    const kill = () => {
      for (const el of document.querySelectorAll('.bar-flip-layer')) {
        for (const a of el.getAnimations?.() || []) {
          try {
            a.cancel()
          } catch {
            /* */
          }
        }
        el.style.transition = 'none'
        el.style.transform = 'none'
        delete el.dataset.runFlip
      }
    }
    kill()
    const orig = Element.prototype.animate
    if (!Element.prototype.__v29OrigAnimate) {
      Element.prototype.__v29OrigAnimate = orig
      Element.prototype.animate = function (keyframes, opts) {
        // Still create a finished empty anim so callers don't throw — but no visible travel
        const a = orig.call(this, [{ opacity: 1 }, { opacity: 1 }], { duration: 0, fill: 'forwards' })
        this.style.transform = 'none'
        return a
      }
    }
    window.__v29KillSwap = setInterval(kill, 16)
  })
}

/** After seek, a stale finish writes a bogus translate — cancel cleanup must fail. */
export async function injectStaleCallbackFault(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-v29-fault', 'stale')
    const fire = () => {
      for (const el of document.querySelectorAll('.bar-flip-layer')) {
        el.style.transition = 'none'
        el.style.transform = 'translate(48px, 0px)'
        el.dataset.runFlip = '1'
        el.dataset.transitionId = 'stale-injected'
      }
    }
    fire()
    window.__v29StaleTimer = setInterval(fire, 30)
  })
}

/** Clip primary array heavily while leaving data slot usable. */
export async function injectPrimaryClipFault(page) {
  await page.evaluate(() => {
    const primary =
      document.querySelector('.arrays-panel .array-view:not(.array-view-compact)') ||
      document.querySelector('[data-testid="viz-canvas"] .array-view')
    if (!primary) return
    primary.setAttribute('data-v29-fault', 'clip')
    primary.style.overflow = 'hidden'
    primary.style.maxHeight = '28px'
    primary.style.height = '28px'
  })
}

export async function clearAllFaults(page) {
  await page.evaluate(() => {
    if (window.__v29KillSwap) {
      clearInterval(window.__v29KillSwap)
      window.__v29KillSwap = null
    }
    if (window.__v29StaleTimer) {
      clearInterval(window.__v29StaleTimer)
      window.__v29StaleTimer = null
    }
    if (Element.prototype.__v29OrigAnimate) {
      Element.prototype.animate = Element.prototype.__v29OrigAnimate
      delete Element.prototype.__v29OrigAnimate
    }
    document.getElementById('v29-fault-bounce')?.remove()
    document.documentElement.removeAttribute('data-v29-fault')
    for (const el of document.querySelectorAll('[data-v29-fault]')) {
      el.removeAttribute('data-v29-fault')
      el.style.transform = ''
      el.style.overflow = ''
      el.style.maxHeight = ''
      el.style.height = ''
      el.style.transition = ''
      if (el.classList?.contains('bar-flip-layer') || el.matches?.('.bar-flip-layer')) {
        el.style.transform = 'none'
        delete el.dataset.runFlip
        delete el.dataset.transitionId
      }
    }
    // also clear injected transforms on flip layers
    for (const el of document.querySelectorAll('.bar-flip-layer')) {
      if (el.dataset.transitionId === 'stale-injected') {
        el.style.transform = 'none'
        delete el.dataset.runFlip
        delete el.dataset.transitionId
      }
    }
    const scene = document.querySelector('[data-testid="workbench-viz-slot"]')
    if (scene) scene.style.transform = ''
  })
}
