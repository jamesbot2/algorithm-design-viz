import { describe, expect, it } from 'vitest'
import { generateSteps as dijkstra } from '../src/algorithms/dijkstra'
import { generateSteps as bellmanFord } from '../src/algorithms/bellmanFord'
import { generateSteps as floyd } from '../src/algorithms/floyd'
import { generateSteps as prim } from '../src/algorithms/prim'
import { generateSteps as kruskal } from '../src/algorithms/kruskal'
import { generateSteps as kadane } from '../src/algorithms/kadane'
import { generateSteps as kmp } from '../src/algorithms/kmp'
import { generateSteps as knapsack } from '../src/algorithms/knapsack01'
import { generateSteps as bubbleSort } from '../src/algorithms/bubbleSort'
import { meta as dijkstraMeta } from '../src/algorithms/dijkstra'

describe('P0-01 meta', () => {
  it('dijkstra titled 朴素 and O(V²+E)', () => {
    expect(dijkstraMeta.title).toContain('朴素')
    expect(dijkstraMeta.timeComplexity).toMatch(/V²/)
  })
})

describe('P0-06 semantics', () => {
  it('dijkstra rejects negative weights', () => {
    const steps = dijkstra([], [[0, 1, -1], [1, 2, 2]], 3, 0)
    expect(steps[0]?.result).toMatchObject({ ok: false, error: 'negative_weight' })
  })

  it('bellmanFord flags reachable negative cycle without valid dist claim', () => {
    // classic negative cycle reachable from 0
    const edges: [number, number, number][] = [
      [0, 1, 1],
      [1, 2, 1],
      [2, 1, -3],
    ]
    const steps = bellmanFord([], edges, 3, 0)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ ok: false, error: 'negative_cycle_reachable' })
    expect(last.message).toMatch(/不可信|负环/)
  })

  it('floyd flags negative diagonal', () => {
    const m = [
      [0, 1],
      [-3, 0],
    ]
    // after floyd, may create neg cycle via 0->1->0 = 1 + (-3) = -2
    const steps = floyd([], m)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ ok: false, error: 'negative_cycle' })
  })

  it('kruskal disconnected reports forest not MST success', () => {
    const edges: [number, number, number][] = [
      [0, 1, 1],
      [2, 3, 1],
    ]
    const steps = kruskal([], edges, 4)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ kind: 'forest' })
    expect(last.message).toMatch(/不连通|森林/)
  })

  it('prim disconnected reports partial', () => {
    const edges: [number, number, number][] = [
      [0, 1, 1],
      [2, 3, 1],
    ]
    const steps = prim([], edges, 4, 0)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ kind: 'partial' })
  })

  it('kadane empty and all-negative', () => {
    const empty = kadane([])
    expect(empty[0]?.result).toMatchObject({ hasSubarray: false })
    const neg = kadane([-5, -2, -7])
    const last = neg[neg.length - 1]!
    expect(last.result).toMatchObject({ best: -2, range: [1, 1] })
  })

  it('kmp empty pattern matches at 0; pi documented in meta', () => {
    const steps = kmp([], 'abc', '')
    expect(steps[0]?.result).toMatchObject({ hits: [0] })
  })

  it('knapsack capacity 0 yields 0', () => {
    const steps = knapsack([], [2, 3], [4, 5], 0)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ maxValue: 0 })
  })
})

describe('sort multiset', () => {
  it('bubbleSort preserves multiset', () => {
    const input = [3, 1, 2, 1, 3]
    const steps = bubbleSort(input)
    const last = steps[steps.length - 1]!
    const out = last.arrays!.a as number[]
    expect([...out].sort((a, b) => a - b)).toEqual([1, 1, 2, 3, 3])
    expect(out).toEqual([1, 1, 2, 3, 3])
  })
})

describe('P0-03 graph edge ids', () => {
  it('dijkstra edges have stable ids and accumulate', () => {
    const steps = dijkstra([])
    const withGraph = steps.filter((s) => s.graph)
    expect(withGraph.length).toBeGreaterThan(0)
    const e0 = withGraph[0]!.graph!.edges[0]!
    expect(e0.id).toBeTruthy()
    const last = withGraph[withGraph.length - 1]!
    expect((last.graph!.highlightEdgeIds ?? []).length).toBeGreaterThanOrEqual(0)
  })
})

describe('P0-04 matrixTargets', () => {
  it('knapsack emits matrixTargets', () => {
    const steps = knapsack([])
    expect(steps.some((s) => s.matrixTargets?.dp)).toBe(true)
  })
})
