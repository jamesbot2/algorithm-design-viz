/**
 * V31-01 — main-scene-priority run budget for an array scene with reserved companions
 * (merge sort left/right, insertion sort temp/key, plus the aux bar).
 *
 * Inputs are MEASURED once per run / width (never per frame):
 *   scene      — height available to the primary pane's content (stage client height, minus a
 *                stacked recursion-tree pane), minus panel chrome (gaps, paddings, margins)
 *   mainNeed   — the main card's real need: its readable floor, raised when non-elastic content
 *                (cells rows / pointer tracks) needs more at this width
 *   shapes     — laid-out heights of every distinct companion-strip shape of the run (natural,
 *                wrapping layout)
 *   compact    — the same frames laid out COMPACT (each companion card one scrolling row of cells,
 *                cards side by side while two fit, aux bar on its own line) — the readable band
 *
 * Priority order (V30 had it inverted: companions took everything but the main floor):
 *   1. the main card keeps at least its need,
 *   2. the companion band takes at most COMPANION_SHARE of the scene — but never less than the
 *      run's TYPICAL (median) strip, so the common frame is shown whole without scrolling,
 *   3. the band never drops below the run's smallest legal strip (then the STAGE scrolls — the
 *      visible fallback for very small windows).
 * When the run's tallest strip fits under that limit the band is exactly run-max (no scrolling at
 * all). Otherwise the band switches to the COMPACT layout and is exactly as tall as the run's
 * tallest compact frame: every frame's cards, names and pointer tracks fit vertically; long buffers
 * scroll horizontally per card (current pointers followed, visible affordance). If even that exceeds
 * the room left by the main card's need, the band keeps the compact height and the stage scrolls
 * (visible fallback) — pointers are never cut to honour a share.
 */
export const COMPANION_SHARE = 1 / 3

export interface BudgetInput {
  scene: number
  mainNeed: number
  shapes: number[]
  compact?: number[]
}

export interface BudgetDecision {
  /** null = run-max fits (band = tallest shape); number = capped band height (px). */
  cap: number | null
  limit: number
  shapeMin: number
  shapeTypical: number
  shapeMax: number
  /** which rule bounded the band (for traces / data attributes) */
  reason: 'run-max' | 'share' | 'typical' | 'main-need' | 'min-shape' | 'compact' | 'compact-tight'
  compactMax?: number
}

export function companionBudget({ scene, mainNeed, shapes, compact }: BudgetInput): BudgetDecision | null {
  const hs = shapes.filter((h) => Number.isFinite(h) && h > 0).sort((a, b) => a - b)
  if (!hs.length || !(scene > 0)) return null
  const shapeMin = hs[0]!
  const shapeMax = hs[hs.length - 1]!
  const shapeTypical = hs[Math.floor((hs.length - 1) / 2)]!
  const share = scene * COMPANION_SHARE
  const readable = Math.min(shapeMax, shapeTypical)
  const shareCap = Math.max(share, readable)
  const room = scene - mainNeed
  const limit = Math.min(shareCap, room)
  if (shapeMax <= limit + 0.5) return { cap: null, limit, shapeMin, shapeTypical, shapeMax, reason: 'run-max' }
  const cs = (compact ?? []).filter((h) => Number.isFinite(h) && h > 0)
  if (cs.length) {
    const compactMax = Math.max(...cs)
    // compact layout no shorter than the natural tallest frame: keep natural run-max (nothing scrolls)
    if (compactMax >= shapeMax - 0.5) return { cap: null, limit, shapeMin, shapeTypical, shapeMax, reason: 'run-max', compactMax }
    return { cap: Math.round(compactMax * 100) / 100, limit, shapeMin, shapeTypical, shapeMax, compactMax, reason: compactMax <= room + 0.5 ? 'compact' : 'compact-tight' }
  }
  const cap = Math.max(shapeMin, limit)
  const reason = cap === shapeMin && limit < shapeMin ? 'min-shape' : room < shareCap ? 'main-need' : share >= readable ? 'share' : 'typical'
  return { cap: Math.round(cap * 100) / 100, limit, shapeMin, shapeTypical, shapeMax, reason }
}
