/** V25-02: signed chart model — plot lanes & value domain (pure geometry). */
import { describe, expect, it } from 'vitest'
import { computeBarGeometry } from '../src/components/ArrayView'
import { signedLabelPlacement, signedPlotLanes, SIGNED_EDGE_LANE_PX, SIGNED_VALUE_LABEL_PX } from '../src/components/signedPlot'

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
  it('squeezed mixed plot: short-bar labels go across y(0) in their own column → no lane needed', () => {
    const g = computeBarGeometry([1, -1], undefined, 32, { hasPos: true, hasNeg: true })
    expect(signedLabelPlacement(g.heights[0]!, 'pos', g.zeroRatio, 32)).toBe('across')
    expect(signedLabelPlacement(g.heights[1]!, 'neg', g.zeroRatio, 32)).toBe('across')
    expect(signedPlotLanes(g, 32)).toEqual({ top: 0, bottom: 0 })
    expect(signedPlotLanes(null, 32)).toEqual({ top: 0, bottom: 0 })
  })
  it('placement rule: inside for tall bars, tip when own half has room, across otherwise (mixed only)', () => {
    expect(signedLabelPlacement(40, 'pos', 0.5, 160)).toBe('inside')
    expect(signedLabelPlacement(0, 'zero', 0.5, 160)).toBe('inside')
    expect(signedLabelPlacement(4, 'pos', 0.5, 160)).toBe('tip')
    expect(signedLabelPlacement(4, 'neg', 0.5, 160)).toBe('tip')
    expect(signedLabelPlacement(10, 'pos', 0.3, 40)).toBe('across') // up-room 12 < 10+16
    expect(signedLabelPlacement(10, 'neg', 0.7, 40)).toBe('across')
  })
  it('single-sign squeezed plot never uses across; the tip label gets a lane instead', () => {
    const g = computeBarGeometry([-1, -8], undefined, 12, { hasPos: false, hasNeg: true })
    expect(g.zeroRatio).toBe(0)
    expect(signedLabelPlacement(g.heights[0]!, 'neg', g.zeroRatio, 12)).toBe('tip')
    const lanes = signedPlotLanes(g, 12)
    // every bar is short at span 12 → each tip label must fit below its tip; the deepest one sets the lane
    expect(lanes.bottom).toBe(Math.ceil(Math.max(...g.heights.map((h) => h + 2 + SIGNED_VALUE_LABEL_PX - 12))))
    expect(lanes.bottom).toBeGreaterThan(0)
  })
  it('across in a mixed plot where the opposite half is tiny reserves only the missing room', () => {
    // [10,-1] with span 20: zero near bottom; -1 is short, down-room small → across (label above y(0))
    const g = computeBarGeometry([10, -1], undefined, 20, { hasPos: true, hasNeg: true })
    const place = signedLabelPlacement(g.heights[1]!, 'neg', g.zeroRatio, 20)
    const lanes = signedPlotLanes(g, 20)
    if (place === 'across') expect(lanes.top).toBe(Math.ceil(Math.max(0, 2 + SIGNED_VALUE_LABEL_PX - g.zeroRatio * 20)))
    expect(lanes.top).toBeGreaterThanOrEqual(0)
  })
})
