import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import GraphView from '../../src/components/GraphView'
import type { GraphState } from '../../src/types/step'

afterEach(() => cleanup())

describe('V9 GraphView reverse edges', () => {
  it('renders reverse pair as two curved channels with distinct labels', () => {
    const graph: GraphState = {
      nodes: [
        { id: '0', x: 80, y: 120 },
        { id: '1', x: 320, y: 120 },
      ],
      edges: [
        { id: '0->1', from: 0, to: 1, weight: 3, directed: true },
        { id: '1->0', from: 1, to: 0, weight: 5, directed: true },
      ],
    }
    const { container } = render(<GraphView graph={graph} />)
    const labels = [...container.querySelectorAll('[data-edge-label]')].map((el) => el.textContent)
    expect(labels.sort()).toEqual(['3', '5'])
    // at least two edge paths (plus marker paths in defs)
    const edgePaths = [...container.querySelectorAll('g[data-edge-id] path')]
    expect(edgePaths.length).toBe(2)
    const d0 = edgePaths[0]!.getAttribute('d') ?? ''
    const d1 = edgePaths[1]!.getAttribute('d') ?? ''
    expect(d0).not.toBe(d1)
    expect(d0.includes('Q') || d1.includes('Q')).toBe(true)
  })

  it('supports self-loop explicitly', () => {
    const graph: GraphState = {
      nodes: [{ id: '0', x: 100, y: 100 }],
      edges: [{ id: '0->0', from: 0, to: 0, weight: 1, directed: true }],
    }
    const { container } = render(<GraphView graph={graph} />)
    expect(container.querySelector('[data-self-loop="1"]')).toBeTruthy()
  })
})
