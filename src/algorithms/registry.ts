import type { Step } from '../types/step'
import type { Trace, ValidateResult } from '../core/trace/types'
import { TRACE_PROTOCOL_VERSION } from '../core/trace/types'
import { algorithms as legacyAlgorithms, type AlgoModule, type AlgoMeta } from './index'
import * as knapsack01 from './knapsack01'
import * as lcs from './lcs'
import * as dijkstra from './dijkstra'

/** Legacy-compatible registry entry with optional typed validate/solve. */
export interface RegistryEntry {
  id: string
  meta: AlgoMeta
  generateSteps: AlgoModule['generateSteps']
  validate?: (raw: unknown) => ValidateResult<unknown>
  solve?: (input: unknown) => { trace: Trace; result: unknown }
}

function wrapLegacySteps(
  algoId: string,
  meta: AlgoMeta,
  steps: Step[],
  inputSnapshot?: unknown,
): Trace {
  const last = steps[steps.length - 1]
  const resultPayload = last?.result
  const ok =
    resultPayload && typeof resultPayload === 'object' && 'ok' in (resultPayload as object)
      ? Boolean((resultPayload as { ok: boolean }).ok)
      : true
  return {
    protocolVersion: TRACE_PROTOCOL_VERSION,
    algoId,
    implName: meta.implName,
    implVersion: meta.implVersion,
    status: ok ? 'ok' : 'algorithm_error',
    steps,
    result:
      resultPayload && typeof resultPayload === 'object'
        ? {
            ok,
            code:
              'error' in (resultPayload as object)
                ? String((resultPayload as { error?: string }).error ?? '')
                : undefined,
            data: resultPayload,
          }
        : { ok: true, data: resultPayload },
    inputSnapshot,
  }
}

export type KnapsackInput = {
  weights: number[]
  values: number[]
  capacity: number
}

export type LcsInput = { x: string; y: string }

export type DijkstraInput = {
  edges: [number, number, number][]
  n: number
  start: number
}

const knapsackTyped = {
  id: 'knapsack01',
  meta: knapsack01.meta as AlgoMeta,
  generateSteps: knapsack01.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<KnapsackInput> {
    const r = raw as Partial<KnapsackInput>
    const weights = r?.weights ?? knapsack01.meta.defaultWeights
    const values = r?.values ?? knapsack01.meta.defaultValues
    const capacity = r?.capacity ?? knapsack01.meta.defaultCapacity
    if (!Array.isArray(weights) || !Array.isArray(values)) {
      return { ok: false, issues: [{ field: 'weights/values', reason: '须为数组' }] }
    }
    if (weights.length !== values.length) {
      return { ok: false, issues: [{ field: 'weights', reason: '与 values 长度不一致' }] }
    }
    if (typeof capacity !== 'number' || capacity < 0 || !Number.isFinite(capacity)) {
      return { ok: false, issues: [{ field: 'capacity', reason: '须为非负有限数' }] }
    }
    return { ok: true, value: { weights, values, capacity } }
  },
  solve(input: unknown) {
    const v = knapsackTyped.validate(input)
    if (!v.ok) {
      return {
        trace: {
          protocolVersion: TRACE_PROTOCOL_VERSION,
          algoId: 'knapsack01',
          status: 'validation_error' as const,
          steps: [],
          result: { ok: false, code: 'validation_error', data: v.issues },
        },
        result: v,
      }
    }
    const { weights, values, capacity } = v.value
    const steps = knapsack01.generateSteps([], weights, values, capacity)
    return {
      trace: wrapLegacySteps('knapsack01', knapsack01.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const lcsTyped = {
  id: 'lcs',
  meta: lcs.meta as AlgoMeta,
  generateSteps: lcs.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<LcsInput> {
    const r = raw as Partial<LcsInput>
    const x = r?.x ?? lcs.meta.defaultX
    const y = r?.y ?? lcs.meta.defaultY
    if (typeof x !== 'string' || typeof y !== 'string') {
      return { ok: false, issues: [{ field: 'x/y', reason: '须为字符串' }] }
    }
    return { ok: true, value: { x, y } }
  },
  solve(input: unknown) {
    const v = lcsTyped.validate(input)
    if (!v.ok) {
      return {
        trace: {
          protocolVersion: TRACE_PROTOCOL_VERSION,
          algoId: 'lcs',
          status: 'validation_error' as const,
          steps: [],
          result: { ok: false, code: 'validation_error', data: v.issues },
        },
        result: v,
      }
    }
    const steps = lcs.generateSteps([], v.value.x, v.value.y)
    return {
      trace: wrapLegacySteps('lcs', lcs.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const dijkstraTyped = {
  id: 'dijkstra',
  meta: dijkstra.meta as AlgoMeta,
  generateSteps: dijkstra.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<DijkstraInput> {
    const r = (raw ?? {}) as Partial<DijkstraInput>
    const edges = r.edges ?? dijkstra.meta.defaultEdges
    const n = r.n ?? dijkstra.meta.defaultN
    const start = r.start ?? dijkstra.meta.defaultStart
    if (!Array.isArray(edges)) {
      return { ok: false, issues: [{ field: 'edges', reason: '须为数组' }] }
    }
    if (typeof n !== 'number' || n <= 0) {
      return { ok: false, issues: [{ field: 'n', reason: '须为正整数' }] }
    }
    if (typeof start !== 'number' || start < 0 || start >= n) {
      return { ok: false, issues: [{ field: 'start', reason: '起点越界' }] }
    }
    for (const e of edges) {
      if (!Array.isArray(e) || e.length < 3) {
        return { ok: false, issues: [{ field: 'edges', reason: '边格式须为 [u,v,w]' }] }
      }
      if (e[2]! < 0) {
        return {
          ok: false,
          issues: [{ field: 'edges', reason: `负权边 ${e[0]}→${e[1]} 权 ${e[2]}` }],
        }
      }
    }
    return { ok: true, value: { edges: edges as [number, number, number][], n, start } }
  },
  solve(input: unknown) {
    const v = dijkstraTyped.validate(input)
    if (!v.ok) {
      return {
        trace: {
          protocolVersion: TRACE_PROTOCOL_VERSION,
          algoId: 'dijkstra',
          status: 'validation_error' as const,
          steps: [],
          result: { ok: false, code: 'validation_error', data: v.issues },
        },
        result: v,
      }
    }
    const { edges, n, start } = v.value
    const steps = dijkstra.generateSteps([], edges, n, start)
    return {
      trace: wrapLegacySteps('dijkstra', dijkstra.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

/** Typed + legacy registry. Pages may keep using algorithms from index.ts. */
export const registry: Record<string, RegistryEntry> = {
  ...Object.fromEntries(
    Object.entries(legacyAlgorithms).map(([id, mod]) => [
      id,
      { id, meta: mod.meta, generateSteps: mod.generateSteps },
    ]),
  ),
  knapsack01: knapsackTyped,
  lcs: lcsTyped,
  dijkstra: dijkstraTyped,
}

export function getAlgo(id: string): RegistryEntry | undefined {
  return registry[id]
}
