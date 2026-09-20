
import { describe, expect, it } from 'vitest'

/**
 * Pure geometry helper mirroring V21-01 content-coord scroll.
 * offsetTop vs wrong offsetParent must not be used as pre.scrollTop.
 */
function contentTop(pre: { scrollTop: number; getBoundingClientRect: () => DOMRect },
  el: { getBoundingClientRect: () => DOMRect }) {
  const preR = pre.getBoundingClientRect()
  const elR = el.getBoundingClientRect()
  return pre.scrollTop + (elR.top - preR.top)
}

describe('V21-01 pseudo content coords', () => {
  it('contentTop is relative to pre scrollport even when offsetParent is page', () => {
    const pre = {
      scrollTop: 50,
      getBoundingClientRect: () => ({ top: 100, bottom: 250, left: 0, right: 100, width: 100, height: 150, x: 0, y: 100, toJSON() {} }) as DOMRect,
    }
    const el = {
      getBoundingClientRect: () => ({ top: 80, bottom: 103, left: 0, right: 100, width: 100, height: 23, x: 0, y: 80, toJSON() {} }) as DOMRect,
      offsetTop: 264, // wrong parent (.page.algo-page)
    }
    const ct = contentTop(pre, el)
    // el is 20px above pre viewport top → contentTop = 50 + (80-100) = 30
    expect(ct).toBe(30)
    // Using offsetTop as scrollTop would be 264 — wildly wrong
    expect(el.offsetTop).toBe(264)
    expect(Math.abs(ct - el.offsetTop)).toBeGreaterThan(100)
  })
})
