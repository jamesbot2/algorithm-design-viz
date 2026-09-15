import { describe, expect, it } from 'vitest'
import { getAlgo } from '../src/algorithms/registry'
import { TRACE_PROTOCOL_VERSION } from '../src/core/trace/types'

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
})
