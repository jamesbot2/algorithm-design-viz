import { describe, expect, it } from 'vitest'
import {
  curveControl,
  fitViewBox,
  insetEndpoints,
  parallelChannelOffset,
  selfLoopPath,
  undirectedKey,
} from '../src/utils/graphEdgeGeometry'

describe('V9 graph reverse-edge geometry', () => {
  it('assigns opposite channels to reverse pair by stable id order', () => {
    const sibs = [
      { id: 'a->b', from: 'a', to: 'b' },
      { id: 'b->a', from: 'b', to: 'a' },
    ]
    const o1 = parallelChannelOffset('a->b', 'a', 'b', sibs, 18)
    const o2 = parallelChannelOffset('b->a', 'b', 'a', sibs, 18)
    expect(o1).not.toBe(0)
    expect(o2).not.toBe(0)
    expect(o1).toBe(-o2)
  })

  it('insets endpoints so arrows clear node radii', () => {
    const r = insetEndpoints(0, 0, 100, 0, 16, 20)
    expect(r.ax).toBeGreaterThan(0)
    expect(r.bx).toBeLessThan(100)
  })

  it('places reverse labels on independent control points', () => {
    // Same geometric chord, opposite channel offsets (as parallelChannelOffset assigns)
    const c1 = curveControl(0, 0, 100, 0, 18)
    const c2 = curveControl(0, 0, 100, 0, -18)
    expect(Math.abs(c1.y - c2.y)).toBeGreaterThan(10)
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
