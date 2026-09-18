/**
 * V14-04 / V15-04: Strict graph visibility checks.
 * Topmost hit must be the target — NOT merely "stack contains .graph-svg".
 *
 * V15-04 separates concerns:
 * - geometryVisible: rect in viewport + not excessively clipped by overflow ancestors
 * - hitReachable: pointer hit at sample points reaches the target (pe:auto stack)
 * - textReadable: label font-size / height (NOT width — wide tiny fonts fail)
 * - paintOcclusionChecked: opaque paint above target fails even when pe:none
 */

export type HitSample = {
  x: number
  y: number
  top: Element | null
  stack: Element[]
}

export type StrictVisibilityIssue =
  | 'missing-target'
  | 'off-viewport'
  | 'clipped'
  | 'topmost-not-target'
  | 'opaque-overlay'
  | 'empty-hit'
  | 'unreadable-label'
  | 'hidden-canvas'
  | 'transport-cover'
  | 'inspector-cover'
  | 'paint-occluded'
  | 'stale-or-empty-sample'

export type StrictVisibilityFields = {
  geometryVisible: boolean
  hitReachable: boolean
  textReadable: boolean
  paintOcclusionChecked: boolean
}

export type StrictVisibilityResult = {
  ok: boolean
  issues: StrictVisibilityIssue[]
  fields: StrictVisibilityFields
  detail?: string
}

const ALLOWED_PLOT_SELECTORS = [
  '.graph-svg',
  '.graph-plot',
  '.graph-view',
  '[data-testid="graph-svg"]',
  '[data-testid="graph-plot"]',
  '[data-testid="graph-view"]',
]

/** True if el is the target or a descendant of target (or target of el). */
export function isTopmostTarget(top: Element | null, target: Element): boolean {
  if (!top) return false
  if (top === target) return true
  if (target.contains(top)) return true
  const topNode = top.closest?.('[data-node-id], [data-testid^="graph-node"]')
  const tgtNode = target.closest?.('[data-node-id], [data-testid^="graph-node"]')
  if (topNode && tgtNode && topNode === tgtNode) return true
  return false
}

/** True if topmost is an opaque overlay that is NOT an allowed plot object. */
export function isOpaqueOverlay(top: Element | null, target: Element): boolean {
  if (!top) return true
  if (isTopmostTarget(top, target)) return false
  const inAllowed = ALLOWED_PLOT_SELECTORS.some(
    (sel) => top.matches?.(sel) || Boolean(top.closest?.(sel)),
  )
  if (!inAllowed) return true
  return !isTopmostTarget(top, target)
}

function clipsOverflow(style: CSSStyleDeclaration): boolean {
  const vals = [style.overflow, style.overflowX, style.overflowY]
  return vals.some((v) => v === 'hidden' || v === 'clip' || v === 'auto' || v === 'scroll')
}

/** Fraction of target rect area that intersects ancestor rect (0..1). */
export function overlapFraction(inner: DOMRect, outer: DOMRect): number {
  const x1 = Math.max(inner.left, outer.left)
  const y1 = Math.max(inner.top, outer.top)
  const x2 = Math.min(inner.right, outer.right)
  const y2 = Math.min(inner.bottom, outer.bottom)
  const w = Math.max(0, x2 - x1)
  const h = Math.max(0, y2 - y1)
  const area = Math.max(1e-6, inner.width * inner.height)
  return (w * h) / area
}

/** Sample points across the target (center + mid-edges) for clip/hit checks. */
export function multiSamplePoints(r: DOMRect): { x: number; y: number }[] {
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const insetX = Math.min(4, r.width * 0.15)
  const insetY = Math.min(4, r.height * 0.15)
  return [
    { x: cx, y: cy },
    { x: r.left + insetX, y: cy },
    { x: r.right - insetX, y: cy },
    { x: cx, y: r.top + insetY },
    { x: cx, y: r.bottom - insetY },
  ]
}

/**
 * Geometry: on-screen, non-degenerate, and not heavily clipped by overflow
 * ancestors (incl. overflow:auto/scroll). Center-in alone is insufficient —
 * e.g. 35% clipped with center still inside must fail.
 */
export function geometryVisible(
  el: Element,
  clipAncestors: Element[] = [],
  opts?: { minOverlap?: number },
): { visible: boolean; reason?: StrictVisibilityIssue } {
  const minOverlap = opts?.minOverlap ?? 0.85
  const r = el.getBoundingClientRect()
  if (r.width < 1 || r.height < 1) return { visible: false, reason: 'hidden-canvas' }
  if (
    r.bottom < 0 ||
    r.right < 0 ||
    r.top > (window.innerHeight || 0) ||
    r.left > (window.innerWidth || 0)
  ) {
    return { visible: false, reason: 'off-viewport' }
  }
  for (const anc of clipAncestors) {
    const ar = anc.getBoundingClientRect()
    let style: CSSStyleDeclaration
    try {
      style = getComputedStyle(anc)
    } catch {
      continue
    }
    if (!clipsOverflow(style)) continue
    if (overlapFraction(r, ar) < minOverlap) {
      return { visible: false, reason: 'clipped' }
    }
    // Multi-point: majority of sample points must lie inside the clip rect
    const pts = multiSamplePoints(r)
    const inside = pts.filter(
      (p) => p.x >= ar.left && p.x <= ar.right && p.y >= ar.top && p.y <= ar.bottom,
    ).length
    if (inside < Math.ceil(pts.length * 0.8)) {
      return { visible: false, reason: 'clipped' }
    }
  }
  return { visible: true }
}

export function collectClipAncestors(el: Element): Element[] {
  const out: Element[] = []
  let cur: Element | null = el.parentElement
  while (cur) {
    out.push(cur)
    cur = cur.parentElement
  }
  return out
}

function parseAlpha(color: string): number {
  if (!color || color === 'transparent') return 0
  const m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i)
  if (m) return m[4] !== undefined ? Number(m[4]) : 1
  if (color.startsWith('#')) {
    if (color.length === 9) return parseInt(color.slice(7, 9), 16) / 255
    if (color.length === 5) return parseInt(color.slice(4, 5) + color.slice(4, 5), 16) / 255
    return 1
  }
  if (color === 'none') return 0
  return 1
}

/** Heuristic: element paints an opaque layer at (x,y) inside its border box. */
export function paintsOpaqueAt(el: Element, x: number, y: number): boolean {
  const r = el.getBoundingClientRect()
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false
  let style: CSSStyleDeclaration
  try {
    style = getComputedStyle(el)
  } catch {
    return false
  }
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const opacity = Number(style.opacity)
  if (!(opacity > 0.05)) return false
  const bgA = parseAlpha(style.backgroundColor)
  const borderA = Math.max(
    parseAlpha(style.borderTopColor),
    parseAlpha(style.borderRightColor),
    parseAlpha(style.borderBottomColor),
    parseAlpha(style.borderLeftColor),
  )
  // Treat solid backgrounds (alpha*opacity >= 0.4) as occluding paint
  if (bgA * opacity >= 0.4) return true
  // SVG shapes with fill
  if (typeof (el as SVGElement).tagName === 'string') {
    const fill = style.fill
    if (fill && fill !== 'none' && parseAlpha(fill) * opacity >= 0.4) {
      // Only if it's not the target itself — caller filters
      return true
    }
  }
  void borderA
  return false
}

/**
 * Paint occlusion: elements with pointer-events:none still paint.
 * elementsFromPoint skips them, so we scan intersecting candidates.
 */
export function findPaintOccluders(target: Element, x: number, y: number): Element[] {
  const out: Element[] = []
  if (typeof document === 'undefined') return out
  const all = document.body ? document.body.querySelectorAll('*') : []
  const targetRoot =
    target.closest?.('[data-node-id], [data-testid^="graph-node"], [data-edge-id]') ?? target
  for (const el of all) {
    if (el === target || target.contains(el) || targetRoot?.contains(el)) continue
    // Skip descendants of allowed plot that are themselves graph content under target's svg
    let style: CSSStyleDeclaration
    try {
      style = getComputedStyle(el)
    } catch {
      continue
    }
    // Only care about pe:none (pe:auto already caught by hit test) OR anything
    // that paints above — for pe:none this is the V15 gap.
    if (style.pointerEvents !== 'none') continue
    if (!paintsOpaqueAt(el, x, y)) continue
    // z-index / tree order: if element is position fixed/absolute covering, count it
    out.push(el)
  }
  return out
}

/**
 * Text readability: font-size OR rendered height — NOT width.
 * A 4px-tall but very wide label must fail.
 */
export function textReadable(
  el: Element,
  opts?: { minLabelPx?: number },
): { readable: boolean; reason?: StrictVisibilityIssue } {
  const min = opts?.minLabelPx ?? 10
  const r = el.getBoundingClientRect()
  let fs = 0
  try {
    fs = parseFloat(getComputedStyle(el).fontSize || '0')
  } catch {
    fs = 0
  }
  // Prefer font-size; also fail tiny rendered height (SVG text bbox)
  if ((fs > 0 && fs < min) || r.height + 0.01 < min) {
    return { readable: false, reason: 'unreadable-label' }
  }
  return { readable: true }
}

/**
 * Evaluate one target with separated field results.
 */
export function evaluateTargetVisibility(
  target: Element,
  sample: HitSample,
  opts?: { minLabelPx?: number; isLabel?: boolean; skipPaintCheck?: boolean },
): StrictVisibilityResult {
  const issues: StrictVisibilityIssue[] = []
  const fields: StrictVisibilityFields = {
    geometryVisible: true,
    hitReachable: true,
    textReadable: true,
    paintOcclusionChecked: false,
  }

  if (!target.isConnected) {
    return {
      ok: false,
      issues: ['missing-target'],
      fields: {
        geometryVisible: false,
        hitReachable: false,
        textReadable: false,
        paintOcclusionChecked: true,
      },
    }
  }

  // Stale / empty sample (caller forgot to hit-test)
  if (
    (!sample.top && sample.stack.length === 0) ||
    (sample.x === 0 && sample.y === 0 && !sample.top && sample.stack.length === 0)
  ) {
    // Distinguish truly empty hit from a legitimate (0,0) — empty stack is the signal
    if (!sample.top && sample.stack.length === 0) {
      issues.push('empty-hit')
      issues.push('stale-or-empty-sample')
      fields.hitReachable = false
    }
  }

  const clips = collectClipAncestors(target)
  const geo = geometryVisible(target, clips)
  fields.geometryVisible = geo.visible
  if (!geo.visible && geo.reason) issues.push(geo.reason)

  if (sample.top || sample.stack.length > 0) {
    if (isOpaqueOverlay(sample.top, target)) {
      issues.push('opaque-overlay')
      issues.push('topmost-not-target')
      fields.hitReachable = false
    } else if (!isTopmostTarget(sample.top, target)) {
      issues.push('topmost-not-target')
      fields.hitReachable = false
    }
  }

  const top = sample.top
  if (top?.closest?.('[data-testid="viz-inspector"], .inspector-sheet, .viz-inspector')) {
    issues.push('inspector-cover')
    fields.hitReachable = false
  }
  if (top?.closest?.('.playback-transport, [data-testid="workbench-transport"], .transport-bar')) {
    issues.push('transport-cover')
    fields.hitReachable = false
  }

  // Paint occlusion (pe:none opaque overlays)
  if (!opts?.skipPaintCheck) {
    const cx = sample.x || target.getBoundingClientRect().left + target.getBoundingClientRect().width / 2
    const cy = sample.y || target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
    const occluders = findPaintOccluders(target, cx, cy)
    fields.paintOcclusionChecked = true
    if (occluders.length > 0) {
      issues.push('paint-occluded')
      issues.push('opaque-overlay')
      fields.hitReachable = false
    }
  } else {
    fields.paintOcclusionChecked = false
  }

  if (opts?.isLabel) {
    const tr = textReadable(target, { minLabelPx: opts.minLabelPx })
    fields.textReadable = tr.readable
    if (!tr.readable && tr.reason) issues.push(tr.reason)
  }

  return { ok: issues.length === 0, issues, fields }
}

/** Browser helper: sample elementsFromPoint at element center. */
export function sampleHitAtCenter(el: Element): HitSample {
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const stack =
    typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : []
  return { x, y, top: stack[0] ?? null, stack: [...stack] }
}

/** Multi-point hit: fail if any primary sample is occluded (pe:auto). */
export function sampleHitsMulti(el: Element): HitSample[] {
  const r = el.getBoundingClientRect()
  return multiSamplePoints(r).map((p) => {
    const stack =
      typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(p.x, p.y) : []
    return { x: p.x, y: p.y, top: stack[0] ?? null, stack: [...stack] }
  })
}

/** In-page evaluator stub — use assertStrictGraphVisible in e2e. */
export function measureStrictGraphVisibilityInPage(): never {
  throw new Error('Use assertStrictGraphVisible(page) which inlines the browser script')
}
