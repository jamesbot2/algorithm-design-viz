/**
 * V31-01 — main-scene-priority run budget for an array scene with reserved companions
 * (merge sort left/right, insertion sort temp/key, plus the aux bar).
 *
 * Inputs are MEASURED once per run / width (never per frame):
 *   scene      — height available to the primary pane's content (stage client height, minus a
 *                stacked recursion-tree pane), minus panel chrome (gaps, paddings, margins)
 *   mainNeed   — the main card's real need: its readable floor, raised when non-elastic content
 *                (cells rows / pointer tracks) needs more at this width
 *   shapes     — laid-out heights of every distinct companion-strip shape of the run
 *
 * Priority order (V30 had it inverted: companions took everything but the main floor):
 *   1. the main card keeps at least its need,
 *   2. the companion band takes at most COMPANION_SHARE of the scene — but never less than the
 *      run's TYPICAL (median) strip, so the common frame is shown whole without scrolling,
 *   3. the band never drops below the run's smallest legal strip (then the STAGE scrolls — the
 *      visible fallback for very small windows).
 * When the run's tallest strip fits under that limit the band is exactly run-max (no scrolling at
 * all). Otherwise the band is one fixed height for the whole run and taller frames scroll inside
 * it (with a visible affordance and pointer follow — see DeclaredArrayScene).
 */
export const COMPANION_SHARE = 1 / 3

export interface BudgetInput {
  scene: number
  mainNeed: number
  shapes: number[]
}

export interface BudgetDecision {
  /** null = run-max fits (band = tallest shape); number = capped band height (px). */
  cap: number | null
  limit: number
  shapeMin: number
  shapeTypical: number
  shapeMax: number
  /** which rule bounded the band (for traces / data attributes) */
  reason: 'run-max' | 'share' | 'typical' | 'main-need' | 'min-shape'
}

export function companionBudget({ scene, mainNeed, shapes }: BudgetInput): BudgetDecision | null {
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
  const cap = Math.max(shapeMin, limit)
  const reason = cap === shapeMin && limit < shapeMin ? 'min-shape' : room < shareCap ? 'main-need' : share >= readable ? 'share' : 'typical'
  return { cap: Math.round(cap * 100) / 100, limit, shapeMin, shapeTypical, shapeMax, reason }
}
