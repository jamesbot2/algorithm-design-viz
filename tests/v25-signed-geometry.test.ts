/** V25-02: signed chart model — plot lanes & value domain (pure geometry). */
import { describe, expect, it } from 'vitest'
import { computeBarGeometry } from '../src/components/ArrayView'
import { signedPlotLanes, SIGNED_EDGE_LANE_PX, SIGNED_VALUE_LABEL_PX } from '../src/components/signedPlot'

describe('V25-02 signed plot model', () => {
  it('equal magnitude opposite signs → equal lengths; zero → 0; same zero line', () => {
    const g = computeBarGeometry([5, -5, 0], undefined, 160, { hasPos: true, hasNeg: true })
    expect(g.heights[0]).toBe(g.heights[1])
    expect(g.heights[2]).toBe(0)
    expect(g.zeroRatio).toBe(0.5)
    expect(g.directions).toEqual(['pos', 'neg', 'zero'])
  })
  it('[100,1,-100,0]: magnitude only from value / run domain', () => {
    const g = computeBarGeometry([100, 1, -100, 0], undefined, 200, { hasPos: true, hasNeg: true })
    expect(g.heights[0]).toBe(100)
    expect(g.heights[2]).toBe(100)
    expect(g.heights[1]).toBeCloseTo(1)
    expect(g.heights[3]).toBe(0)
  })
  it('run-level domain keeps meaning across frames (same value → same height)', () => {
    const run = { hasPos: true, hasNeg: true }
    const a = computeBarGeometry([4, -2, 1], 5, 160, run)
    const b = computeBarGeometry([1, 4, 3], 5, 160, run) // mid-run all-positive frame
    expect(a.heights[0]).toBe(b.heights[1])
    expect(a.zeroRatio).toBe(b.zeroRatio)
  })
  it('lanes: none for a roomy mixed chart; edge lane where the zero line meets a plot edge', () => {
    expect(signedPlotLanes(computeBarGeometry([5, -5, 0], undefined, 160, { hasPos: true, hasNeg: true }), 160)).toEqual({ top: 0, bottom: 0 })
    // all negative + zero: zero line at the top edge → top lane for the centred zero marker
    expect(signedPlotLanes(computeBarGeometry([-3, 0, -1], undefined, 160, { hasPos: false, hasNeg: true }), 160)).toEqual({ top: SIGNED_EDGE_LANE_PX, bottom: 0 })
    // all zero: zero line at the bottom edge
    expect(signedPlotLanes(computeBarGeometry([0, 0], undefined, 160), 160)).toEqual({ top: 0, bottom: SIGNED_EDGE_LANE_PX })
  })
  it('lanes grow only for short-bar labels that would leave a squeezed plot', () => {
    const g = computeBarGeometry([1, -1], undefined, 32, { hasPos: true, hasNeg: true })
    const need = Math.ceil(g.heights[0]! + 2 + SIGNED_VALUE_LABEL_PX - 16)
    expect(signedPlotLanes(g, 32)).toEqual({ top: need, bottom: need })
    expect(signedPlotLanes(null, 32)).toEqual({ top: 0, bottom: 0 })
  })
})
