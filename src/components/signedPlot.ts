/** V25-02 signed bar chart model (pure geometry, shared by ArrayView and tests). */

/** Below this data height the value label sits just above the bar (never clipped / never overlapping the index). */
export const SHORT_BAR_PX = 18

/**
 * V25-02 signed chart model. A signed bar column is TWO stacked regions:
 *   1. plot area  (.bar-plot, explicit height = laneTop + span + laneBottom):
 *      the zero line sits at laneTop + zeroRatio·span; bar heights come only from
 *      |value| / run-level absMax (computeBarGeometry) — never moved to dodge labels.
 *   2. annotation tracks below the plot (normal flow): index row, then the pointer
 *      track (tags wrap under their own slot; the measured height is budgeted).
 * An edge lane is reserved only where the zero line coincides with a plot edge
 * (all-negative → top, all-zero → bottom) so the centred zero marker and its "0"
 * stay inside the plot instead of spilling into the annotation track.
 */
/** Half the zero marker (22px) + 1px border slack. */
export const SIGNED_EDGE_LANE_PX = 12
/** Value label glyph box (0.68rem mono, line-height 1) + text-shadow slack. */
export const SIGNED_VALUE_LABEL_PX = 14
export type SignedLabelPlacement = 'inside' | 'tip' | 'across'

/**
 * Where a signed bar's value label goes (explicit rule, V25-02):
 *   inside — bar ≥ SHORT_BAR_PX: label inside the bar at its tip end (as before);
 *   tip    — short bar and the label fits in its own half beyond the tip: label just
 *            outside the tip (above a positive tip / below a negative tip);
 *   across — short bar in a MIXED-sign plot whose half has no room beyond the tip: the
 *            label sits just across the zero line, in the empty opposite half of its OWN
 *            column (a positive bar has nothing below y(0) in its column and vice versa).
 * Single-sign plots never use `across` (there is no opposite half); they get edge lanes.
 */
export function signedLabelPlacement(
  h: number,
  dir: 'pos' | 'neg' | 'zero',
  zeroRatio: number,
  span: number,
): SignedLabelPlacement {
  if (dir === 'zero' || h >= SHORT_BAR_PX) return 'inside'
  const room = dir === 'pos' ? zeroRatio * span : (1 - zeroRatio) * span
  const mixed = zeroRatio > 0 && zeroRatio < 1
  if (h + 2 + SIGNED_VALUE_LABEL_PX <= room || !mixed) return 'tip'
  return 'across'
}

export function signedPlotLanes(
  geo: { zeroRatio: number; heights: number[]; directions: ('pos' | 'neg' | 'zero')[] } | null,
  span: number,
): { top: number; bottom: number } {
  if (!geo) return { top: 0, bottom: 0 }
  const upRoom = geo.zeroRatio * span
  const downRoom = (1 - geo.zeroRatio) * span
  let top = 0
  let bottom = 0
  geo.directions.forEach((d, i) => {
    const h = geo.heights[i] ?? 0
    if (d === 'zero') {
      top = Math.max(top, SIGNED_EDGE_LANE_PX - upRoom)
      bottom = Math.max(bottom, SIGNED_EDGE_LANE_PX - downRoom)
    } else {
      const place = signedLabelPlacement(h, d, geo.zeroRatio, span)
      if (place === 'across') {
        // label occupies the opposite half next to y(0)
        const need = 2 + SIGNED_VALUE_LABEL_PX
        if (d === 'pos') bottom = Math.max(bottom, need - downRoom)
        else top = Math.max(top, need - upRoom)
      } else {
        // inside / tip: the label must stay in the plot beyond (or inside) the tip
        const need = place === 'tip' ? h + 2 + SIGNED_VALUE_LABEL_PX : h
        if (d === 'pos') top = Math.max(top, need - upRoom)
        else bottom = Math.max(bottom, need - downRoom)
      }
    }
  })
  return { top: Math.ceil(Math.max(0, top)), bottom: Math.ceil(Math.max(0, bottom)) }
}
