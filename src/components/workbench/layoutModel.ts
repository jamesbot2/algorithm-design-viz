/**
 * V23: ONE layout-state source for the learning workbench.
 *
 * - `WorkbenchLayoutPrefs` is user/session intent, owned by the page (AlgoPage /
 *   KnapsackUnit) and passed down. Switching modes never resets it.
 * - `resolveLayoutMode` is a pure function of the REAL container budget
 *   (ResizeObserver contentRect of the workbench + scroll viewport height from
 *   Layout) — never window.innerWidth, never DOM scanning for portals.
 */

export type LayoutMode = 'docked' | 'wide' | 'tabbed'
export type ActiveView = 'demo' | 'data' | 'code'

export interface WorkbenchLayoutPrefs {
  /** Tabbed mode: which surface is visible. Other modes ignore it (all visible). */
  activeView: ActiveView
  /** Docked/wide: current-data region expanded (true) or collapsed to its header. */
  dataVisible: boolean
  /** User-dragged code column width (px). null → content-calibrated default. */
  codeWidthPx: number | null
  /** User-dragged data region height (px, docked) / width (px, wide). null → auto. */
  dataSizePx: number | null
}

export const DEFAULT_LAYOUT_PREFS: WorkbenchLayoutPrefs = {
  activeView: 'demo',
  dataVisible: true,
  codeWidthPx: null,
  dataSizePx: null,
}

export interface LayoutBudget {
  /** Workbench content-box width (px). */
  width: number
  /** Height of the page scroll viewport that hosts the workbench (px). */
  viewportHeight: number
}

/** Readable minimums — content-driven, not decorative. */
export const MIN_SCENE_W = 420
export const MIN_CODE_W = 340
export const MIN_DATA_W = 280
/** Below this, docked two-column would crush either demo or code. */
export const TABBED_MAX_W = 760
/** Below this viewport height, docked cannot hold scene + data + transport; use tabs. */
export const TABBED_MAX_VH = 460
/** Three real columns only when each gets readable width. */
export const WIDE_MIN_W = MIN_SCENE_W + MIN_DATA_W + MIN_CODE_W + 460

export function resolveLayoutMode(b: LayoutBudget): LayoutMode {
  if (b.width <= 0) return 'docked'
  if (b.width < TABBED_MAX_W) return 'tabbed'
  if (b.viewportHeight > 0 && b.viewportHeight < TABBED_MAX_VH) return 'tabbed'
  if (b.width >= WIDE_MIN_W) return 'wide'
  return 'docked'
}

/** Content-calibrated code column width (soft-wrap on; ~48-70ch readable). */
export function defaultCodeWidth(mode: LayoutMode, width: number): number {
  if (mode === 'wide') return clamp(Math.round(width * 0.3), MIN_CODE_W + 40, 720)
  return clamp(Math.round(width * 0.38), MIN_CODE_W, 600)
}

export function resolveCodeWidth(mode: LayoutMode, width: number, pref: number | null): number {
  const base = pref ?? defaultCodeWidth(mode, width)
  // Never squeeze the demo below its readable minimum; never squeeze code below MIN_CODE_W.
  const demoMin = mode === 'wide' ? MIN_SCENE_W + MIN_DATA_W : MIN_SCENE_W
  return clamp(base, MIN_CODE_W, Math.max(MIN_CODE_W, width - demoMin - 16))
}

/** Wide mode data column (px). */
export function resolveWideDataWidth(width: number, codeW: number, pref: number | null): number {
  const base = pref ?? Math.round(width * 0.22)
  return clamp(base, MIN_DATA_W, Math.max(MIN_DATA_W, width - codeW - MIN_SCENE_W - 24))
}

/**
 * Docked data height: intrinsic content height (so the default small state needs
 * no scrolling) capped so the scene keeps its share; user drag overrides.
 */
export function resolveDockedDataHeight(opts: {
  columnHeight: number
  contentHeight: number
  pref: number | null
  sceneMin: number
}): number {
  const { columnHeight, contentHeight, pref, sceneMin } = opts
  const cap = Math.max(96, Math.min(columnHeight * 0.45, columnHeight - sceneMin))
  const want = pref ?? contentHeight
  return clamp(Math.round(want), 96, Math.round(cap))
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
