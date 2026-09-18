/**
 * V14-04: Shared strict graph visibility checks.
 * Topmost hit must be the target node/label/allowed plot object — NOT merely
 * "stack contains .graph-svg". Opaque overlays of any class must fail.
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

export type StrictVisibilityResult = {
  ok: boolean
  issues: StrictVisibilityIssue[]
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
  // Label/circle inside the same node group
  const topNode = top.closest?.('[data-node-id], [data-testid^="graph-node"]')
  const tgtNode = target.closest?.('[data-node-id], [data-testid^="graph-node"]')
  if (topNode && tgtNode && topNode === tgtNode) return true
  return false
}

/** True if topmost is an opaque overlay that is NOT an allowed plot object. */
export function isOpaqueOverlay(top: Element | null, target: Element): boolean {
  if (!top) return true
  if (isTopmostTarget(top, target)) return false
  // Any element outside the graph plot that paints above the target counts
  const inAllowed = ALLOWED_PLOT_SELECTORS.some(
    (sel) => top.matches?.(sel) || Boolean(top.closest?.(sel)),
  )
  if (!inAllowed) return true
  // Inside plot but not the target (e.g. another node, or foreign HTML overlay
  // injected inside the plot host) — still a failure for THIS target sample.
  return !isTopmostTarget(top, target)
}

export function geometryVisible(
  el: Element,
  clipAncestors: Element[] = [],
): { visible: boolean; reason?: StrictVisibilityIssue } {
  const r = el.getBoundingClientRect()
  if (r.width < 1 || r.height < 1) return { visible: false, reason: 'hidden-canvas' }
  if (r.bottom < 0 || r.right < 0 || r.top > (window.innerHeight || 0) || r.left > (window.innerWidth || 0)) {
    return { visible: false, reason: 'off-viewport' }
  }
  for (const anc of clipAncestors) {
    const ar = anc.getBoundingClientRect()
    const style = getComputedStyle(anc)
    const clips =
      style.overflow === 'hidden' ||
      style.overflow === 'clip' ||
      style.overflowX === 'hidden' ||
      style.overflowY === 'hidden'
    if (!clips) continue
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx < ar.left || cx > ar.right || cy < ar.top || cy > ar.bottom) {
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

/**
 * Evaluate one target (node circle, node label, edge weight, arrow) at its center.
 * Requires topmost hit to be the target (or its node group) — stack-contains-svg is NOT enough.
 */
export function evaluateTargetVisibility(
  target: Element,
  sample: HitSample,
  opts?: { minLabelPx?: number; isLabel?: boolean },
): StrictVisibilityResult {
  const issues: StrictVisibilityIssue[] = []
  if (!target.isConnected) {
    return { ok: false, issues: ['missing-target'] }
  }
  const clips = collectClipAncestors(target)
  const geo = geometryVisible(target, clips)
  if (!geo.visible && geo.reason) issues.push(geo.reason)

  if (!sample.top && sample.stack.length === 0) issues.push('empty-hit')
  else if (isOpaqueOverlay(sample.top, target)) {
    issues.push('opaque-overlay')
    issues.push('topmost-not-target')
  } else if (!isTopmostTarget(sample.top, target)) {
    issues.push('topmost-not-target')
  }

  // Chrome covers
  const top = sample.top
  if (top?.closest?.('[data-testid="viz-inspector"], .inspector-sheet, .viz-inspector')) {
    issues.push('inspector-cover')
  }
  if (top?.closest?.('.playback-transport, [data-testid="workbench-transport"], .transport-bar')) {
    issues.push('transport-cover')
  }

  if (opts?.isLabel) {
    const r = target.getBoundingClientRect()
    const min = opts.minLabelPx ?? 10
    if (r.height < min && r.width < min) issues.push('unreadable-label')
  }

  return { ok: issues.length === 0, issues }
}

/** Browser helper: sample elementsFromPoint at element center. */
export function sampleHitAtCenter(el: Element): HitSample {
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : []
  return { x, y, top: stack[0] ?? null, stack: [...stack] }
}

/** In-page evaluator used by Playwright (no module imports inside page). */
export function measureStrictGraphVisibilityInPage(): {
  ok: boolean
  issues: string[]
  nodesChecked: number
  labelsChecked: number
  edgeLabelsChecked: number
  details: { id: string; issues: string[] }[]
} {
  // Re-implement minimal logic inline for page.evaluate bundling via function.toString
  // Callers should use page.evaluate(measureStrictGraphVisibilityInPage) only after
  // injecting the function body — see assertStrictGraphVisible below.
  throw new Error('Use assertStrictGraphVisible(page) which inlines the browser script')
}
