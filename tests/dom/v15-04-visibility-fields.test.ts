import { describe, expect, it, afterEach } from 'vitest'
import {
  evaluateTargetVisibility,
  geometryVisible,
  textReadable,
  findPaintOccluders,
  overlapFraction,
  paintsOpaqueAt,
  type HitSample,
} from '../../src/utils/strictGraphVisibility'

function el(tag = 'div', attrs: Record<string, string> = {}): HTMLElement {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v
    else if (k === 'style') e.setAttribute('style', v)
    else e.setAttribute(k, v)
  }
  return e
}

function stubRect(node: Element, rect: Partial<DOMRect> & { width: number; height: number }) {
  const left = rect.left ?? 0
  const top = rect.top ?? 0
  const width = rect.width
  const height = rect.height
  node.getBoundingClientRect = () =>
    ({
      x: left,
      y: top,
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      toJSON() {},
    }) as DOMRect
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('V15-04 strictGraphVisibility field separation', () => {
  it('positive control: topmost target still passes with fields', () => {
    const g = el('div', { 'data-node-id': '1' })
    const circle = el('div')
    g.appendChild(circle)
    document.body.appendChild(g)
    stubRect(g, { left: 10, top: 10, width: 32, height: 32 })
    stubRect(circle, { left: 10, top: 10, width: 32, height: 32 })
    const sample: HitSample = { x: 26, y: 26, top: circle, stack: [circle, g] }
    const r = evaluateTargetVisibility(g, sample, { skipPaintCheck: true })
    expect(r.fields.hitReachable).toBe(true)
    expect(r.fields.geometryVisible).toBe(true)
    expect(r.ok).toBe(true)
  })

  it('V14 keep: pe:auto opaque overlay fails', () => {
    const node = el('div', { 'data-node-id': '0' })
    const overlay = el('div', { class: 'totally-unknown-fault-overlay-xyz' })
    document.body.append(node, overlay)
    stubRect(node, { left: 0, top: 0, width: 20, height: 20 })
    const sample: HitSample = { x: 10, y: 10, top: overlay, stack: [overlay, node] }
    const r = evaluateTargetVisibility(node, sample, { skipPaintCheck: true })
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('opaque-overlay')
    expect(r.fields.hitReachable).toBe(false)
  })

  it('NEGATIVE: pe:none opaque overlay must fail via paintOcclusionChecked', () => {
    const node = el('div', { 'data-node-id': '0' })
    const overlay = el('div', { class: 'pe-none-opaque-fault' })
    // Inline styles for paintsOpaqueAt
    overlay.style.position = 'fixed'
    overlay.style.left = '0'
    overlay.style.top = '0'
    overlay.style.width = '200px'
    overlay.style.height = '200px'
    overlay.style.background = 'rgba(255,0,0,0.85)'
    overlay.style.pointerEvents = 'none'
    overlay.style.opacity = '1'
    overlay.style.zIndex = '99'
    document.body.append(node, overlay)
    stubRect(node, { left: 20, top: 20, width: 40, height: 40 })
    stubRect(overlay, { left: 0, top: 0, width: 200, height: 200 })
    expect(paintsOpaqueAt(overlay, 40, 40)).toBe(true)
    const occluders = findPaintOccluders(node, 40, 40)
    expect(occluders.length).toBeGreaterThan(0)
    const sample: HitSample = { x: 40, y: 40, top: node, stack: [node] }
    const r = evaluateTargetVisibility(node, sample)
    expect(r.fields.paintOcclusionChecked).toBe(true)
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i === 'paint-occluded' || i === 'opaque-overlay')).toBe(true)
  })

  it('NEGATIVE: tiny font (4px) wide label fails textReadable (height/font, not width)', () => {
    const label = el('span', { class: 'node-label' })
    label.textContent = 'very-long-label-text-that-is-wide'
    label.style.fontSize = '4px'
    document.body.appendChild(label)
    stubRect(label, { left: 0, top: 0, width: 200, height: 4 })
    const tr = textReadable(label, { minLabelPx: 10 })
    expect(tr.readable).toBe(false)
    const sample: HitSample = { x: 100, y: 2, top: label, stack: [label] }
    const r = evaluateTargetVisibility(label, sample, {
      isLabel: true,
      minLabelPx: 10,
      skipPaintCheck: true,
    })
    expect(r.fields.textReadable).toBe(false)
    expect(r.issues).toContain('unreadable-label')
    expect(r.ok).toBe(false)
  })

  it('NEGATIVE: center-in but ~35% clipped must fail geometryVisible', () => {
    const clip = el('div')
    clip.style.overflow = 'hidden'
    const target = el('div')
    clip.appendChild(target)
    document.body.appendChild(clip)
    stubRect(clip, { left: 0, top: 0, width: 100, height: 100 })
    stubRect(target, { left: 60, top: 60, width: 80, height: 80 })
    const frac = overlapFraction(target.getBoundingClientRect(), clip.getBoundingClientRect())
    expect(frac).toBeLessThan(0.85)
    expect(frac).toBeGreaterThan(0.2)
    const geo = geometryVisible(target, [clip])
    expect(geo.visible).toBe(false)
    expect(geo.reason).toBe('clipped')
    const sample: HitSample = { x: 90, y: 90, top: target, stack: [target] }
    const r = evaluateTargetVisibility(target, sample, { skipPaintCheck: true })
    expect(r.fields.geometryVisible).toBe(false)
    expect(r.issues).toContain('clipped')
    expect(r.ok).toBe(false)
  })

  it('NEGATIVE: empty/stale sample fails', () => {
    const node = el('div', { 'data-node-id': '0' })
    document.body.appendChild(node)
    stubRect(node, { left: 0, top: 0, width: 20, height: 20 })
    const r = evaluateTargetVisibility(
      node,
      { x: 0, y: 0, top: null, stack: [] },
      { skipPaintCheck: true },
    )
    expect(r.ok).toBe(false)
    expect(r.issues.some((i) => i === 'empty-hit' || i === 'stale-or-empty-sample')).toBe(true)
    expect(r.fields.hitReachable).toBe(false)
  })

  it('result exposes separate geometry/hit/text/paint fields', () => {
    const node = el('div', { 'data-node-id': '1' })
    document.body.appendChild(node)
    stubRect(node, { left: 1, top: 1, width: 20, height: 20 })
    const r = evaluateTargetVisibility(
      node,
      { x: 11, y: 11, top: node, stack: [node] },
      { skipPaintCheck: true },
    )
    expect(r.fields).toEqual(
      expect.objectContaining({
        geometryVisible: expect.any(Boolean),
        hitReachable: expect.any(Boolean),
        textReadable: expect.any(Boolean),
        paintOcclusionChecked: expect.any(Boolean),
      }),
    )
  })
})
