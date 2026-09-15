import { describe, expect, it } from 'vitest'
import { getAlgo, hasTypedSolve } from '../src/algorithms/registry'
import { TRACE_PROTOCOL_VERSION } from '../src/core/trace/types'
import { freezeSteps, copyStepArrays } from '../src/core/snapshot/freeze'
import { encodeInfinity, decodeInfinity, encodeInfInTree, decodeInfInTree } from '../src/core/json/infinity'
import { runAlgo, createCancelFlag } from '../src/core/runner'

const PRIORITY = [
  'kadane',
  'binarySearch',
  'kmp',
  'editDistance',
  'kruskal',
  'prim',
  'bellmanFord',
  'floyd',
  'bfs',
  'bubbleSort',
  'insertionSort',
  'mergeSort',
  'quickSort',
  'activitySelection',
  'knapsack01',
  'lcs',
  'dijkstra',
]

describe('M1 registry adapters', () => {
  it('knapsack01 validate/solve + generateSteps adapter', () => {
    const mod = getAlgo('knapsack01')!
    expect(mod.validate).toBeTypeOf('function')
    const { trace, result } = mod.solve!({})
    expect(trace.protocolVersion).toBe(TRACE_PROTOCOL_VERSION)
    expect(trace.steps.length).toBeGreaterThan(0)
    expect(result).toMatchObject({ maxValue: expect.any(Number) })
    expect(mod.generateSteps([]).length).toBeGreaterThan(0)
  })

  it('lcs typed solve', () => {
    const mod = getAlgo('lcs')!
    const { trace } = mod.solve!({ x: 'AB', y: 'A' })
    expect(trace.status).toBe('ok')
    expect(trace.result?.data).toMatchObject({ length: 1 })
  })

  it('dijkstra validate rejects negatives', () => {
    const mod = getAlgo('dijkstra')!
    const v = mod.validate!({ edges: [[0, 1, -2]], n: 2, start: 0 })
    expect(v.ok).toBe(false)
  })

  it('all priority algos have typed solve', () => {
    const inputs: Record<string, unknown> = {
      bubbleSort: { arr: [3, 1, 2] },
      insertionSort: { arr: [3, 1, 2] },
      mergeSort: { arr: [3, 1, 2] },
      quickSort: { arr: [3, 1, 2] },
      kadane: { arr: [-2, 1, 3] },
      binarySearch: {},
    }
    for (const id of PRIORITY) {
      expect(hasTypedSolve(id), id).toBe(true)
      const mod = getAlgo(id)!
      const { trace } = mod.solve!(inputs[id] ?? {})
      expect(trace.protocolVersion, id).toBe(TRACE_PROTOCOL_VERSION)
      expect(trace.steps.length, id).toBeGreaterThan(0)
    }
  })
})

describe('M1 snapshot immutability', () => {
  it('freezeSteps prevents array mutation from poisoning history', () => {
    const steps = getAlgo('kadane')!.generateSteps([-2, 1, -3, 4])
    const frozen = freezeSteps(steps)
    const arr = frozen[0]!.arrays!.a as number[]
    expect(() => {
      ;(arr as number[]).push(99)
    }).toThrow()
    const copy = copyStepArrays(steps[0]!)
    ;(copy.arrays!.a as number[])[0] = 12345
    expect(steps[0]!.arrays!.a![0]).not.toBe(12345)
  })
})

describe('M1 infinity encoding', () => {
  it('encodes and decodes ±Infinity consistently', () => {
    expect(encodeInfinity(Infinity)).toEqual({ $inf: 1 })
    expect(encodeInfinity(-Infinity)).toEqual({ $inf: -1 })
    expect(decodeInfinity({ $inf: 1 })).toBe(Infinity)
    expect(decodeInfinity('∞')).toBe(Infinity)
    expect(decodeInfinity('-∞')).toBe(-Infinity)
    const tree = encodeInfInTree({ d: [0, Infinity, -Infinity] })
    expect(tree).toEqual({ d: [0, { $inf: 1 }, { $inf: -1 }] })
    expect(decodeInfInTree(tree)).toEqual({ d: [0, Infinity, -Infinity] })
  })
})

describe('M1 runner', () => {
  it('runAlgo returns structured RunOutcome with budget truncate', () => {
    const mod = getAlgo('bubbleSort')!
    const outcome = runAlgo({
      algoId: 'bubbleSort',
      validate: mod.validate!,
      solve: (input) => {
        const steps = mod.generateSteps((input as { arr: number[] }).arr)
        return { steps, result: steps[steps.length - 1]?.result }
      },
      rawInput: { arr: [3, 1, 2] },
      budget: { maxSteps: 3 },
    })
    expect(outcome.status).toBe('budget_exceeded')
    expect(outcome.truncated).toBe(true)
    expect(outcome.steps!.length).toBe(3)
    expect(outcome.trace?.protocolVersion).toBe(TRACE_PROTOCOL_VERSION)
  })

  it('runAlgo respects cancel flag before solve', () => {
    const mod = getAlgo('kadane')!
    const cancel = createCancelFlag()
    cancel.cancelled = true
    const outcome = runAlgo({
      algoId: 'kadane',
      validate: mod.validate!,
      solve: (input) => {
        const steps = mod.generateSteps((input as { arr: number[] }).arr)
        return { steps, result: null }
      },
      rawInput: { arr: [1, 2] },
      cancel,
    })
    expect(outcome.status).toBe('cancelled')
  })

  it('runAlgo validation_error', () => {
    const mod = getAlgo('bubbleSort')!
    const outcome = runAlgo({
      algoId: 'bubbleSort',
      validate: mod.validate!,
      solve: () => ({ steps: [], result: null }),
      rawInput: { arr: [] },
    })
    expect(outcome.status).toBe('validation_error')
  })
})
