import { describe, expect, it, afterEach } from 'vitest'
import {
  isOpaqueOverlay,
  isTopmostTarget,
  evaluateTargetVisibility,
  type HitSample,
} from '../../src/utils/strictGraphVisibility'

function el(tag = 'div', attrs: Record<string, string> = {}): HTMLElement {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v
    else e.setAttribute(k, v)
  }
  return e
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('V14-04 strict topmost visibility helper', () => {
  it('passes when topmost is the target node', () => {
    const g = el('g', { 'data-node-id': '1' })
    const circle = el('circle')
    g.appendChild(circle)
    document.body.appendChild(g)
    expect(isTopmostTarget(circle, g)).toBe(true)
    expect(isOpaqueOverlay(circle, g)).toBe(false)
  })

  it('fails when opaque overlay of ANY class is topmost (even unknown class)', () => {
    const node = el('circle', { 'data-node-id': '0' })
    const overlay = el('div', { class: 'totally-unknown-fault-overlay-xyz' })
    document.body.append(node, overlay)
    expect(isTopmostTarget(overlay, node)).toBe(false)
    expect(isOpaqueOverlay(overlay, node)).toBe(true)
    const sample: HitSample = { x: 0, y: 0, top: overlay, stack: [overlay, node] }
    const r = evaluateTargetVisibility(node, sample)
    expect(r.ok).toBe(false)
    expect(r.issues).toContain('opaque-overlay')
    expect(r.issues).toContain('topmost-not-target')
  })

  it('fails when stack merely contains .graph-svg but topmost is chrome', () => {
    const svg = el('svg', { class: 'graph-svg' })
    const node = el('circle')
    svg.appendChild(node)
    const transport = el('div', {
      class: 'playback-transport',
      'data-testid': 'workbench-transport',
    })
    document.body.append(svg, transport)
    // Old buggy helper: stack.some(closest .graph-svg) would pass
    const stack = [transport, svg, node]
    expect(
      stack.some((e) => e.closest?.('.graph-svg') || (e as HTMLElement).classList?.contains('graph-svg')),
    ).toBe(true)
    // Strict helper must fail
    expect(isTopmostTarget(transport, node)).toBe(false)
    const r = evaluateTargetVisibility(node, { x: 0, y: 0, top: transport, stack })
    expect(r.ok).toBe(false)
    expect(
      r.issues.some((i) => i === 'topmost-not-target' || i === 'opaque-overlay' || i === 'transport-cover'),
    ).toBe(true)
  })
})
