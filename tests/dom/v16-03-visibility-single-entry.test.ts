import { describe, expect, it, afterEach } from 'vitest'
import {
  measurePageGraphVisibility,
  evaluateTargetVisibility,
  findPaintOccluders,
  paintsOpaqueAt,
  type HitSample,
} from '../../src/utils/strictGraphVisibility'

afterEach(() => {
  document.body.innerHTML = ''
})

function el(tag: string, attrs: Record<string, string> = {}) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  return n
}

function stubRect(
  node: Element,
  box: { left: number; top: number; width: number; height: number },
) {
  const rect = {
    left: box.left,
    top: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    width: box.width,
    height: box.height,
    x: box.left,
    y: box.top,
    toJSON() {
      return this
    },
  } as DOMRect
  Object.defineProperty(node, 'getBoundingClientRect', { configurable: true, value: () => rect })
}

describe('V16-03 single visibility detector entry', () => {
  it('measurePageGraphVisibility is the shared page entry (missing stage → fail)', () => {
    document.body.innerHTML = '<div>empty</div>'
    const report = measurePageGraphVisibility()
    expect(report.ok).toBe(false)
    expect(report.issues.some((i) => i.includes('missing'))).toBe(true)
    expect(report.fieldsSummary).toBeDefined()
  })

  it('pe:none opaque fault fails via same evaluateTargetVisibility / paint fields', () => {
    const node = el('div', { 'data-node-id': '0' })
    const overlay = el('div', { class: 'v16-pe-none-opaque-fault-class', id: 'v16-fault-pe-none' })
    overlay.style.position = 'fixed'
    overlay.style.left = '0'
    overlay.style.top = '0'
    overlay.style.width = '200px'
    overlay.style.height = '200px'
    overlay.style.background = 'rgba(0,0,255,0.75)'
    overlay.style.pointerEvents = 'none'
    overlay.style.opacity = '1'
    overlay.style.zIndex = '99'
    document.body.append(node, overlay)
    stubRect(node, { left: 20, top: 20, width: 40, height: 40 })
    stubRect(overlay, { left: 0, top: 0, width: 200, height: 200 })
    expect(paintsOpaqueAt(overlay, 40, 40)).toBe(true)
    expect(findPaintOccluders(node, 40, 40).length).toBeGreaterThan(0)
    const sample: HitSample = { x: 40, y: 40, top: node, stack: [node] }
    const r = evaluateTargetVisibility(node, sample)
    expect(r.fields.paintOcclusionChecked).toBe(true)
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i === 'paint-occluded' || i === 'opaque-overlay')).toBe(true)
  })
})
