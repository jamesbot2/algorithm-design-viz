/** Pure helpers for graph edge channels, reverse pairs, and fit margins. */

export type Pt = { x: number; y: number }

export function undirectedKey(a: string, b: string): string {
  return a <= b ? `${a}|${b}` : `${b}|${a}`
}

/** Unit normal (left of a→b). */
export function leftNormal(ax: number, ay: number, bx: number, by: number): Pt {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  return { x: -dy / len, y: dx / len }
}

/**
 * V10-05: one fixed geometric normal per unordered endpoint pair.
 * Always left-of (lex-smaller id → lex-larger id), independent of arrow direction.
 * ax,ay = from-node coords; bx,by = to-node coords of the directed edge being drawn.
 */
export function pairCanonicalNormal(
  fromId: string,
  toId: string,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Pt {
  if (fromId <= toId) return leftNormal(ax, ay, bx, by)
  // Directed edge is opposite of canonical chord — flip endpoints for the normal only
  return leftNormal(bx, by, ax, ay)
}

/** Inset endpoints toward each other so arrows clear node radii. */
export function insetEndpoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  startPad: number,
  endPad: number,
): { ax: number; ay: number; bx: number; by: number } {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  return {
    ax: ax + ux * startPad,
    ay: ay + uy * startPad,
    bx: bx - ux * endPad,
    by: by - uy * endPad,
  }
}

/**
 * Channel offset for parallel / reverse edges.
 * indexInPair: 0..count-1 among edges sharing undirected endpoints (excluding self-loops).
 * Uses stable ordering by edge id. Offsets are along the *canonical* normal (see curveControl).
 */
export function parallelChannelOffset(
  edgeId: string,
  from: string,
  to: string,
  siblings: { id: string; from: string; to: string }[],
  spacing = 16,
): number {
  if (from === to) return 0
  const ordered = [...siblings].sort((a, b) => a.id.localeCompare(b.id))
  const idx = ordered.findIndex((e) => e.id === edgeId)
  if (idx < 0 || ordered.length <= 1) return 0
  const mid = (ordered.length - 1) / 2
  return (idx - mid) * spacing
}

/**
 * Quadratic control point for a curved channel.
 * When fromId/toId provided, offset is applied along the canonical pair normal
 * so A→B and B→A with opposite channel indices land on opposite sides (not the same side).
 */
export function curveControl(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  offset: number,
  fromId?: string,
  toId?: string,
): Pt {
  const n =
    fromId != null && toId != null
      ? pairCanonicalNormal(fromId, toId, ax, ay, bx, by)
      : leftNormal(ax, ay, bx, by)
  return {
    x: (ax + bx) / 2 + n.x * offset,
    y: (ay + by) / 2 + n.y * offset,
  }
}

/** Approximate label axis-aligned box around a control/label point. */
export function labelBounds(x: number, y: number, halfW = 14, halfH = 8): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  return { minX: x - halfW, minY: y - halfH, maxX: x + halfW, maxY: y + halfH }
}

export function boundsOverlap(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
  pad = 0,
): boolean {
  return !(
    a.maxX + pad < b.minX ||
    b.maxX + pad < a.minX ||
    a.maxY + pad < b.minY ||
    b.maxY + pad < a.minY
  )
}

/** Self-loop path (elliptical) around a node. Returns null if unsupported policy is reject. */
export function selfLoopPath(
  x: number,
  y: number,
  r = 16,
  loop = 28,
): { d: string; labelX: number; labelY: number } {
  const ox = x + r + loop * 0.35
  const oy = y - loop
  const d = `M ${x + r * 0.6} ${y - r * 0.6} C ${ox} ${oy}, ${ox + loop} ${y + 4}, ${x + r * 0.7} ${y + r * 0.5}`
  return { d, labelX: ox + loop * 0.35, labelY: oy + 4 }
}

export type FitBox = { minX: number; minY: number; maxX: number; maxY: number }

export function expandFit(box: FitBox, x: number, y: number, pad = 0): FitBox {
  return {
    minX: Math.min(box.minX, x - pad),
    minY: Math.min(box.minY, y - pad),
    maxX: Math.max(box.maxX, x + pad),
    maxY: Math.max(box.maxY, y + pad),
  }
}

export function fitViewBox(box: FitBox, fallbackW = 520, fallbackH = 280, margin = 28): string {
  const w = Math.max(80, box.maxX - box.minX)
  const h = Math.max(80, box.maxY - box.minY)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return `0 0 ${fallbackW} ${fallbackH}`
  }
  return `${box.minX - margin} ${box.minY - margin} ${w + margin * 2} ${h + margin * 2}`
}
