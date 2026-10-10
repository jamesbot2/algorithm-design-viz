import { describe, expect, it } from 'vitest'
import { companionBudget, COMPANION_SHARE } from '../src/components/companionBudget'

// Shapes measured at 375×812 (box fonts) for merge sort desc input: scene ≈ 440, main floor 160.
const n7 = [87, 117, 117, 160, 203]
const n16 = [87, 117, 117, 117, 153, 352]
describe('V31-01 companion budget (main-scene priority)', () => {
  it('companion band never takes more than the share when the main card could use it', () => {
    const d = companionBudget({ scene: 440, mainNeed: 160, shapes: n16 })!
    expect(d.cap).toBeCloseTo(440 * COMPANION_SHARE, 1)
    expect(d.reason).toBe('share')
    expect(440 - d.cap!).toBeGreaterThanOrEqual(0.6 * 440)
  })
  it('V30 inversion fixed: band is not "everything but the main floor"', () => {
    const d = companionBudget({ scene: 440, mainNeed: 160, shapes: n16 })!
    expect(d.cap!).toBeLessThan(440 - 160)
  })
  it('run-max when the tallest strip fits inside the share (no scrolling at all)', () => {
    const d = companionBudget({ scene: 600, mainNeed: 160, shapes: [60, 80, 90] })!
    expect(d.cap).toBeNull()
    expect(d.reason).toBe('run-max')
  })
  it('typical (median) strip floor: the common frame is shown whole on short scenes', () => {
    const d = companionBudget({ scene: 300, mainNeed: 160, shapes: n7 })!
    expect(d.cap).toBe(117)
    expect(d.reason).toBe('typical')
  })
  it('main need wins over the share (cells-mode main) but never below the smallest legal strip', () => {
    const d = companionBudget({ scene: 440, mainNeed: 359, shapes: [87, 117, 648] })!
    expect(d.cap).toBe(87)
    expect(d.reason).toBe('min-shape')
    const e = companionBudget({ scene: 440, mainNeed: 320, shapes: [87, 117, 648] })!
    expect(e.cap).toBe(120)
    expect(e.reason).toBe('main-need')
  })
  it('stable: one decision per measured input (no dependency on the current frame)', () => {
    const a = companionBudget({ scene: 440, mainNeed: 160, shapes: n16 })
    const b = companionBudget({ scene: 440, mainNeed: 160, shapes: [...n16].reverse() })
    expect(a).toEqual(b)
  })
  it('monotonic in scene height: a taller scene never gives the main card less', () => {
    let prevMain = -1
    for (let scene = 250; scene <= 900; scene += 10) {
      const d = companionBudget({ scene, mainNeed: 160, shapes: n16 })!
      const band = d.cap ?? d.shapeMax
      const main = scene - band
      expect(main).toBeGreaterThanOrEqual(prevMain - 0.01)
      prevMain = main
    }
  })
  it('nothing measurable → no decision (keep last)', () => {
    expect(companionBudget({ scene: 0, mainNeed: 160, shapes: n16 })).toBeNull()
    expect(companionBudget({ scene: 400, mainNeed: 160, shapes: [] })).toBeNull()
  })
})
