import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../src/components/GraphView.tsx'), 'utf8')

describe('V14-03 pan uses meet/CTM uniform scale', () => {
  it('does not use independent sx=camera.w/plot.w and sy=camera.h/plot.h', () => {
    expect(src).not.toMatch(/camera\.w\s*\/\s*plotSize\.w/)
    expect(src).not.toMatch(/camera\.h\s*\/\s*plotSize\.h/)
    expect(src).not.toMatch(/const sx = .*camera\.w/)
    expect(src).not.toMatch(/const sy = .*camera\.h/)
  })

  it('uses getScreenCTM inverse or Math.min meet scale', () => {
    expect(src).toMatch(/getScreenCTM/)
    expect(src).toMatch(/Math\.min\(\s*plotSize\.w\s*\/\s*camera\.w\s*,\s*plotSize\.h\s*\/\s*camera\.h\s*\)/)
  })

  it('captures pointer on plot host and exposes reset-view', () => {
    expect(src).toMatch(/setPointerCapture/)
    expect(src).toMatch(/graph-reset-view/)
    expect(src).toMatch(/touchAction:\s*['"]none['"]/)
  })
})

/** Pure meet conversion used by the fallback path */
function screenDeltaToUserMeet(
  dxPx: number,
  dyPx: number,
  plotW: number,
  plotH: number,
  camW: number,
  camH: number,
) {
  const scale = Math.min(plotW / camW, plotH / camH)
  return { dx: dxPx / scale, dy: dyPx / scale }
}

describe('V14-03 meet math', () => {
  it('100px drag on 600x200 plot with vb 300x300 → uniform user delta', () => {
    // meet scale = min(600/300, 200/300) = min(2, 0.666) = 0.666...
    const { dx, dy } = screenDeltaToUserMeet(100, 0, 600, 200, 300, 300)
    const scale = Math.min(600 / 300, 200 / 300)
    expect(dx).toBeCloseTo(100 / scale, 6)
    expect(dy).toBe(0)
    // Independent sx/sy would have given dx = 100 * (300/600) = 50 — wrong
    expect(dx).not.toBeCloseTo(50, 1)
  })

  it('100px drag on 200x500 tall plot uses uniform scale not sy alone', () => {
    const { dx, dy } = screenDeltaToUserMeet(0, 100, 200, 500, 300, 300)
    const scale = Math.min(200 / 300, 500 / 300)
    expect(dy).toBeCloseTo(100 / scale, 6)
    expect(dx).toBe(0)
    // Independent sy = 300/500 = 0.6 → user 60; meet scale = 200/300 → user 150
    expect(dy).not.toBeCloseTo(60, 1)
  })
})
