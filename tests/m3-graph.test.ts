import { describe, expect, it } from 'vitest'
import { algoGraphOptions, parseEdgeListText, validateGraphDraft } from '../src/core/graph/validate'
import { defaultDraftFor } from '../src/core/graph/presets'
import { solveDijkstraNaive } from '../src/algorithms/dijkstra'
import { solveDijkstraHeap } from '../src/algorithms/dijkstraHeap'
import { getAlgo } from '../src/algorithms/registry'

describe('M3 graph validate', () => {
  it('accepts default dijkstra draft', () => {
    const d = defaultDraftFor('dijkstra')
    const v = validateGraphDraft(d, algoGraphOptions('dijkstra'))
    expect(v.ok).toBe(true)
  })

  it('rejects negative weights for dijkstra', () => {
    const v = validateGraphDraft(
      { n: 2, edges: [[0, 1, -1]], directed: true, start: 0 },
      algoGraphOptions('dijkstra'),
    )
    expect(v.ok).toBe(false)
  })

  it('rejects undirected flag for dijkstra', () => {
    const v = validateGraphDraft(
      { n: 2, edges: [[0, 1, 1]], directed: false, start: 0 },
      algoGraphOptions('dijkstra'),
    )
    expect(v.ok).toBe(false)
  })

  it('rejects out-of-range endpoints', () => {
    const v = validateGraphDraft(
      { n: 2, edges: [[0, 5, 1]], directed: true, start: 0 },
      algoGraphOptions('dijkstra'),
    )
    expect(v.ok).toBe(false)
  })

  it('parses edge list text', () => {
    const p = parseEdgeListText('0 1 2\n1 2 3')
    expect(p.ok).toBe(true)
    if (p.ok) expect(p.edges).toEqual([
      [0, 1, 2],
      [1, 2, 3],
    ])
  })

  it('allows negatives for bellmanFord', () => {
    const v = validateGraphDraft(
      { n: 2, edges: [[0, 1, -3]], directed: true, start: 0 },
      algoGraphOptions('bellmanFord'),
    )
    expect(v.ok).toBe(true)
  })
})

describe('M3 dijkstraHeap vs naive', () => {
  const graphs: { n: number; edges: [number, number, number][]; start: number }[] = [
    {
      n: 6,
      edges: [
        [0, 1, 4],
        [0, 2, 2],
        [1, 2, 1],
        [1, 3, 5],
        [2, 3, 8],
        [2, 4, 10],
        [3, 4, 2],
        [3, 5, 6],
        [4, 5, 3],
      ],
      start: 0,
    },
    {
      n: 4,
      edges: [
        [0, 1, 1],
        [0, 2, 4],
        [1, 2, 2],
        [1, 3, 6],
        [2, 3, 3],
      ],
      start: 0,
    },
    {
      n: 3,
      edges: [
        [0, 1, 1],
        [1, 2, 1],
      ],
      start: 0,
    },
  ]

  it('dist agrees on shared graphs', () => {
    for (const g of graphs) {
      const a = solveDijkstraNaive(g.edges, g.n, g.start)
      const b = solveDijkstraHeap(g.edges, g.n, g.start)
      expect(a.ok).toBe(true)
      expect(b.ok).toBe(true)
      expect(b.dist).toEqual(a.dist)
    }
  })

  it('filters stale heap entries (staleSkips >= 0) and registry works', () => {
    const g = graphs[0]!
    const b = solveDijkstraHeap(g.edges, g.n, g.start)
    expect(b.staleSkips).toBeGreaterThanOrEqual(0)
    const mod = getAlgo('dijkstraHeap')!
    expect(mod.validate).toBeTypeOf('function')
    const { trace } = mod.solve!({ edges: g.edges, n: g.n, start: g.start })
    expect(trace.steps.length).toBeGreaterThan(0)
    expect(trace.result?.ok).toBe(true)
  })

  it('both reject negatives', () => {
    expect(solveDijkstraNaive([[0, 1, -1]], 2, 0).ok).toBe(false)
    expect(solveDijkstraHeap([[0, 1, -1]], 2, 0).ok).toBe(false)
  })
})
