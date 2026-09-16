import { describe, expect, it } from 'vitest'
import {
  boundsOverlap,
  curveControl,
  fitViewBox,
  insetEndpoints,
  labelBounds,
  parallelChannelOffset,
  pairCanonicalNormal,
  selfLoopPath,
  undirectedKey,
} from '../src/utils/graphEdgeGeometry'

const SPACING = 28

describe('V9/V10 graph reverse-edge geometry', () => {
  it('assigns opposite channels to reverse pair by stable id order', () => {
    const sibs = [
      { id: 'a->b', from: 'a', to: 'b' },
      { id: 'b->a', from: 'b', to: 'a' },
    ]
    const o1 = parallelChannelOffset('a->b', 'a', 'b', sibs, SPACING)
    const o2 = parallelChannelOffset('b->a', 'b', 'a', sibs, SPACING)
    expect(o1).not.toBe(0)
    expect(o2).not.toBe(0)
    expect(o1).toBe(-o2)
  })

  it('insets endpoints so arrows clear node radii', () => {
    const r = insetEndpoints(0, 0, 100, 0, 16, 20)
    expect(r.ax).toBeGreaterThan(0)
    expect(r.bx).toBeLessThan(100)
  })

  it('V10-05: reverse directed edges use one canonical normal (labels do not collapse)', () => {
    const cFwd = curveControl(0, 0, 100, 0, SPACING, 'a', 'b')
    const cRev = curveControl(100, 0, 0, 0, -SPACING, 'b', 'a')
    expect(Math.abs(cFwd.y - cRev.y)).toBeGreaterThan(20)
    const b1 = labelBounds(cFwd.x, cFwd.y, 12, 7)
    const b2 = labelBounds(cRev.x, cRev.y, 12, 7)
    expect(boundsOverlap(b1, b2)).toBe(false)
  })

  it('V10-05: vertical and diagonal chords keep non-overlapping channel boxes', () => {
    const cases: Array<[number, number, number, number, string, string]> = [
      [50, 0, 50, 100, 'a', 'b'],
      [0, 0, 80, 60, 'a', 'b'],
    ]
    for (const [ax, ay, bx, by, fa, fb] of cases) {
      const sibs = [
        { id: `${fa}->${fb}`, from: fa, to: fb },
        { id: `${fb}->${fa}`, from: fb, to: fa },
      ]
      const o1 = parallelChannelOffset(`${fa}->${fb}`, fa, fb, sibs, SPACING)
      const o2 = parallelChannelOffset(`${fb}->${fa}`, fb, fa, sibs, SPACING)
      const c1 = curveControl(ax, ay, bx, by, o1, fa, fb)
      const c2 = curveControl(bx, by, ax, ay, o2, fb, fa)
      expect(boundsOverlap(labelBounds(c1.x, c1.y, 12, 7), labelBounds(c2.x, c2.y, 12, 7))).toBe(
        false,
      )
      // Control points themselves must differ by roughly channel spacing
      expect(Math.hypot(c1.x - c2.x, c1.y - c2.y)).toBeGreaterThan(SPACING * 0.9)
    }
  })

  it('V10-05: 3+ parallel channels keep distinct control points', () => {
    const sibs = [
      { id: 'e0', from: 'a', to: 'b' },
      { id: 'e1', from: 'a', to: 'b' },
      { id: 'e2', from: 'b', to: 'a' },
    ]
    const node = { a: [0, 0] as const, b: [100, 0] as const }
    const pts = sibs.map((e) => {
      const o = parallelChannelOffset(e.id, e.from, e.to, sibs, SPACING)
      const [ax, ay] = node[e.from as 'a' | 'b']
      const [bx, by] = node[e.to as 'a' | 'b']
      return curveControl(ax, ay, bx, by, o, e.from, e.to)
    })
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y)).toBeGreaterThan(
          SPACING * 0.9,
        )
        expect(
          boundsOverlap(
            labelBounds(pts[i]!.x, pts[i]!.y, 12, 7),
            labelBounds(pts[j]!.x, pts[j]!.y, 12, 7),
          ),
        ).toBe(false)
      }
    }
  })

  it('canonical normal ignores arrow direction', () => {
    const n1 = pairCanonicalNormal('a', 'b', 0, 0, 100, 0)
    const n2 = pairCanonicalNormal('b', 'a', 100, 0, 0, 0)
    expect(n1.x).toBeCloseTo(n2.x, 6)
    expect(n1.y).toBeCloseTo(n2.y, 6)
  })

  it('supports self-loop path explicitly', () => {
    const loop = selfLoopPath(40, 40)
    expect(loop.d.startsWith('M')).toBe(true)
    expect(loop.labelX).toBeGreaterThan(40)
  })

  it('fitViewBox includes margin for labels/nodes', () => {
    const vb = fitViewBox({ minX: 0, minY: 0, maxX: 100, maxY: 80 }, 520, 280, 32)
    const parts = vb.split(' ').map(Number)
    expect(parts[0]).toBeLessThan(0)
    expect(parts[2]).toBeGreaterThan(100)
  })

  it('undirectedKey is order-insensitive', () => {
    expect(undirectedKey('2', '1')).toBe(undirectedKey('1', '2'))
  })
})
