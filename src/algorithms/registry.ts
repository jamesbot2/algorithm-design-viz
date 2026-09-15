import type { Step } from '../types/step'
import type { Trace, ValidateResult, ValidationIssue } from '../core/trace/types'
import { TRACE_PROTOCOL_VERSION } from '../core/trace/types'
import { freezeSteps } from '../core/snapshot/freeze'
import { algorithms as legacyAlgorithms, type AlgoModule, type AlgoMeta } from './index'
import * as knapsack01 from './knapsack01'
import * as lcs from './lcs'
import * as dijkstra from './dijkstra'
import * as kadane from './kadane'
import * as binarySearch from './binarySearch'
import type { BinarySearchMode } from './binarySearch'
import * as kmp from './kmp'
import * as editDistance from './editDistance'
import * as kruskal from './kruskal'
import * as prim from './prim'
import * as bellmanFord from './bellmanFord'
import * as floyd from './floyd'
import * as bfs from './bfs'
import * as bubbleSort from './bubbleSort'
import * as insertionSort from './insertionSort'
import * as mergeSort from './mergeSort'
import * as quickSort from './quickSort'
import * as activitySelection from './activitySelection'
import * as nQueens from './nQueens'
import * as matrixChain from './matrixChain'
import * as huffman from './huffman'
import * as maxSubarrayDC from './maxSubarrayDC'

/** Legacy-compatible registry entry with optional typed validate/solve. */
export interface RegistryEntry {
  id: string
  meta: AlgoMeta
  generateSteps: AlgoModule['generateSteps']
  validate?: (raw: unknown) => ValidateResult<unknown>
  solve?: (input: unknown) => { trace: Trace; result: unknown }
}

export function wrapLegacySteps(
  algoId: string,
  meta: AlgoMeta,
  steps: Step[],
  inputSnapshot?: unknown,
  freeze = true,
): Trace {
  const frozen = freeze ? ([...freezeSteps(steps)] as Step[]) : steps
  const last = frozen[frozen.length - 1]
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
    steps: frozen,
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

function validationFail(algoId: string, issues: ValidationIssue[]) {
  return {
    trace: {
      protocolVersion: TRACE_PROTOCOL_VERSION,
      algoId,
      status: 'validation_error' as const,
      steps: [] as Step[],
      result: { ok: false, code: 'validation_error', data: issues },
    },
    result: { ok: false as const, issues },
  }
}

function makeArrayAlgo(
  id: string,
  mod: { meta: AlgoMeta; generateSteps: (input: number[]) => Step[] },
  opts?: { allowEmpty?: boolean },
): RegistryEntry {
  return {
    id,
    meta: mod.meta,
    generateSteps: mod.generateSteps as AlgoModule['generateSteps'],
    validate(raw: unknown): ValidateResult<{ arr: number[] }> {
      const r = raw as { arr?: number[]; input?: number[] } | number[] | null
      let arr: number[] | undefined
      if (Array.isArray(r)) arr = r
      else if (r && typeof r === 'object') arr = r.arr ?? r.input
      if (!Array.isArray(arr)) {
        return { ok: false, issues: [{ field: 'arr', reason: '须为数字数组' }] }
      }
      if (!opts?.allowEmpty && arr.length === 0) {
        return { ok: false, issues: [{ field: 'arr', reason: '数组不能为空' }] }
      }
      if (!arr.every((x) => typeof x === 'number' && Number.isFinite(x))) {
        return { ok: false, issues: [{ field: 'arr', reason: '元素须为有限数字' }] }
      }
      return { ok: true, value: { arr } }
    },
    solve(input: unknown) {
      const v = this.validate!(input)
      if (!v.ok) return validationFail(id, v.issues)
      const steps = mod.generateSteps((v.value as { arr: number[] }).arr)
      return {
        trace: wrapLegacySteps(id, mod.meta, steps, v.value),
        result: steps[steps.length - 1]?.result,
      }
    },
  }
}

// —— Typed adapters ——

export type KnapsackInput = { weights: number[]; values: number[]; capacity: number }
export type LcsInput = { x: string; y: string }
export type DijkstraInput = { edges: [number, number, number][]; n: number; start: number }
export type KadaneInput = { arr: number[] }
export type BinarySearchInput = { arr: number[]; target: number; mode?: BinarySearchMode }
export type KmpInput = { text: string; pattern: string }
export type EditDistanceInput = { a: string; b: string }
export type GraphEdgesInput = { edges: [number, number, number][]; n: number }
export type BfsInput = { adj: Record<number, number[]>; start: number }
export type FloydInput = { matrix: number[][] }
export type ActivityInput = { starts: number[]; ends: number[] }
export type PrimInput = { edges: [number, number, number][]; n: number; start?: number }
export type BellmanFordInput = { edges: [number, number, number][]; n: number; start: number }

const knapsackTyped: RegistryEntry = {
  id: 'knapsack01',
  meta: knapsack01.meta as AlgoMeta,
  generateSteps: knapsack01.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<KnapsackInput> {
    const r = (raw ?? {}) as Partial<KnapsackInput>
    const weights = r.weights ?? knapsack01.meta.defaultWeights
    const values = r.values ?? knapsack01.meta.defaultValues
    const capacity = r.capacity ?? knapsack01.meta.defaultCapacity
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
    const v = this.validate!(input)
    if (!v.ok) return validationFail('knapsack01', v.issues)
    const { weights, values, capacity } = v.value as KnapsackInput
    const steps = knapsack01.generateSteps([], weights, values, capacity)
    return {
      trace: wrapLegacySteps('knapsack01', knapsack01.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const lcsTyped: RegistryEntry = {
  id: 'lcs',
  meta: lcs.meta as AlgoMeta,
  generateSteps: lcs.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<LcsInput> {
    const r = (raw ?? {}) as Partial<LcsInput>
    const x = r.x ?? lcs.meta.defaultX
    const y = r.y ?? lcs.meta.defaultY
    if (typeof x !== 'string' || typeof y !== 'string') {
      return { ok: false, issues: [{ field: 'x/y', reason: '须为字符串' }] }
    }
    return { ok: true, value: { x, y } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('lcs', v.issues)
    const { x, y } = v.value as LcsInput
    const steps = lcs.generateSteps([], x, y)
    return {
      trace: wrapLegacySteps('lcs', lcs.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const dijkstraTyped: RegistryEntry = {
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
    const v = this.validate!(input)
    if (!v.ok) return validationFail('dijkstra', v.issues)
    const { edges, n, start } = v.value as DijkstraInput
    const steps = dijkstra.generateSteps([], edges, n, start)
    return {
      trace: wrapLegacySteps('dijkstra', dijkstra.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const kadaneTyped = makeArrayAlgo('kadane', kadane, { allowEmpty: true })

const binarySearchTyped: RegistryEntry = {
  id: 'binarySearch',
  meta: binarySearch.meta as AlgoMeta,
  generateSteps: binarySearch.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<BinarySearchInput> {
    const r = (raw ?? {}) as Partial<BinarySearchInput>
    const arr = r.arr ?? (binarySearch.meta.defaultArray as number[])
    const target = r.target ?? binarySearch.meta.defaultTarget
    const mode = r.mode ?? 'requireSorted'
    if (!Array.isArray(arr)) {
      return { ok: false, issues: [{ field: 'arr', reason: '须为数组' }] }
    }
    if (typeof target !== 'number' || !Number.isFinite(target)) {
      return { ok: false, issues: [{ field: 'target', reason: '须为有限数字' }] }
    }
    if (mode === 'requireSorted' && !binarySearch.validateSorted(arr)) {
      return {
        ok: false,
        issues: [{ field: 'arr', reason: '数组未按非降序排列' }],
      }
    }
    return { ok: true, value: { arr, target, mode } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('binarySearch', v.issues)
    const { arr, target, mode } = v.value as BinarySearchInput
    const steps = binarySearch.generateSteps(arr, target, mode ?? 'requireSorted')
    return {
      trace: wrapLegacySteps('binarySearch', binarySearch.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const kmpTyped: RegistryEntry = {
  id: 'kmp',
  meta: kmp.meta as AlgoMeta,
  generateSteps: kmp.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<KmpInput> {
    const r = (raw ?? {}) as Partial<KmpInput>
    const text = r.text ?? kmp.meta.defaultText
    const pattern = r.pattern ?? kmp.meta.defaultPattern
    if (typeof text !== 'string' || typeof pattern !== 'string') {
      return { ok: false, issues: [{ field: 'text/pattern', reason: '须为字符串' }] }
    }
    return { ok: true, value: { text, pattern } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('kmp', v.issues)
    const { text, pattern } = v.value as KmpInput
    const steps = kmp.generateSteps([], text, pattern)
    return {
      trace: wrapLegacySteps('kmp', kmp.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const editDistanceTyped: RegistryEntry = {
  id: 'editDistance',
  meta: editDistance.meta as AlgoMeta,
  generateSteps: editDistance.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<EditDistanceInput> {
    const r = (raw ?? {}) as Partial<EditDistanceInput>
    const a = r.a ?? editDistance.meta.defaultA
    const b = r.b ?? editDistance.meta.defaultB
    if (typeof a !== 'string' || typeof b !== 'string') {
      return { ok: false, issues: [{ field: 'a/b', reason: '须为字符串' }] }
    }
    return { ok: true, value: { a, b } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('editDistance', v.issues)
    const { a, b } = v.value as EditDistanceInput
    const steps = editDistance.generateSteps([], a, b)
    return {
      trace: wrapLegacySteps('editDistance', editDistance.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const kruskalTyped: RegistryEntry = {
  id: 'kruskal',
  meta: kruskal.meta as AlgoMeta,
  generateSteps: kruskal.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<GraphEdgesInput> {
    const r = (raw ?? {}) as Partial<GraphEdgesInput>
    const edges = r.edges ?? kruskal.meta.defaultEdges
    const n = r.n ?? kruskal.meta.defaultN
    if (!Array.isArray(edges) || typeof n !== 'number' || n <= 0) {
      return { ok: false, issues: [{ field: 'edges/n', reason: '无效图输入' }] }
    }
    return { ok: true, value: { edges: edges as [number, number, number][], n } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('kruskal', v.issues)
    const { edges, n } = v.value as GraphEdgesInput
    const steps = kruskal.generateSteps([], edges, n)
    return {
      trace: wrapLegacySteps('kruskal', kruskal.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const primTyped: RegistryEntry = {
  id: 'prim',
  meta: prim.meta as AlgoMeta,
  generateSteps: prim.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<PrimInput> {
    const r = (raw ?? {}) as Partial<PrimInput>
    const edges = r.edges ?? prim.meta.defaultEdges
    const n = r.n ?? prim.meta.defaultN
    const start = r.start ?? prim.meta.defaultStart
    if (!Array.isArray(edges) || typeof n !== 'number' || n <= 0) {
      return { ok: false, issues: [{ field: 'edges/n', reason: '无效图输入' }] }
    }
    if (typeof start !== 'number' || start < 0 || start >= n) {
      return { ok: false, issues: [{ field: 'start', reason: '起点越界' }] }
    }
    return { ok: true, value: { edges: edges as [number, number, number][], n, start } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('prim', v.issues)
    const { edges, n, start } = v.value as PrimInput
    const steps = prim.generateSteps([], edges, n, start ?? 0)
    return {
      trace: wrapLegacySteps('prim', prim.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const bellmanFordTyped: RegistryEntry = {
  id: 'bellmanFord',
  meta: bellmanFord.meta as AlgoMeta,
  generateSteps: bellmanFord.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<BellmanFordInput> {
    const r = (raw ?? {}) as Partial<BellmanFordInput>
    const edges = r.edges ?? bellmanFord.meta.defaultEdges
    const n = r.n ?? bellmanFord.meta.defaultN
    const start = r.start ?? bellmanFord.meta.defaultStart
    if (!Array.isArray(edges) || typeof n !== 'number' || n <= 0) {
      return { ok: false, issues: [{ field: 'edges/n', reason: '无效图输入' }] }
    }
    if (typeof start !== 'number' || start < 0 || start >= n) {
      return { ok: false, issues: [{ field: 'start', reason: '起点越界' }] }
    }
    return { ok: true, value: { edges: edges as [number, number, number][], n, start } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('bellmanFord', v.issues)
    const { edges, n, start } = v.value as BellmanFordInput
    const steps = bellmanFord.generateSteps([], edges, n, start)
    return {
      trace: wrapLegacySteps('bellmanFord', bellmanFord.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const floydTyped: RegistryEntry = {
  id: 'floyd',
  meta: floyd.meta as AlgoMeta,
  generateSteps: floyd.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<FloydInput> {
    const r = (raw ?? {}) as Partial<FloydInput>
    const matrix = r.matrix ?? floyd.meta.defaultMatrix
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return { ok: false, issues: [{ field: 'matrix', reason: '须为非空方阵' }] }
    }
    return { ok: true, value: { matrix } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('floyd', v.issues)
    const { matrix } = v.value as FloydInput
    const steps = floyd.generateSteps([], matrix)
    return {
      trace: wrapLegacySteps('floyd', floyd.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const bfsTyped: RegistryEntry = {
  id: 'bfs',
  meta: bfs.meta as AlgoMeta,
  generateSteps: bfs.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<BfsInput> {
    const r = (raw ?? {}) as Partial<BfsInput>
    const adj = r.adj ?? bfs.meta.defaultAdj
    const start = r.start ?? bfs.meta.defaultStart
    if (!adj || typeof adj !== 'object') {
      return { ok: false, issues: [{ field: 'adj', reason: '须为邻接表对象' }] }
    }
    if (typeof start !== 'number') {
      return { ok: false, issues: [{ field: 'start', reason: '须为数字' }] }
    }
    return { ok: true, value: { adj, start } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('bfs', v.issues)
    const { adj, start } = v.value as BfsInput
    const steps = bfs.generateSteps([], adj, start)
    return {
      trace: wrapLegacySteps('bfs', bfs.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}

const activityTyped: RegistryEntry = {
  id: 'activitySelection',
  meta: activitySelection.meta as AlgoMeta,
  generateSteps: activitySelection.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown): ValidateResult<ActivityInput> {
    const r = (raw ?? {}) as Partial<ActivityInput>
    const starts = r.starts ?? activitySelection.meta.defaultStarts
    const ends = r.ends ?? activitySelection.meta.defaultEnds
    if (!Array.isArray(starts) || !Array.isArray(ends) || starts.length !== ends.length) {
      return { ok: false, issues: [{ field: 'starts/ends', reason: '须等长数组' }] }
    }
    return { ok: true, value: { starts, ends } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('activitySelection', v.issues)
    const { starts, ends } = v.value as ActivityInput
    const steps = activitySelection.generateSteps([], starts, ends)
    return {
      trace: wrapLegacySteps('activitySelection', activitySelection.meta as AlgoMeta, steps, v.value),
      result: steps[steps.length - 1]?.result,
    }
  },
}


const nQueensTyped: RegistryEntry = {
  id: 'nQueens',
  meta: nQueens.meta as AlgoMeta,
  generateSteps: nQueens.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown) {
    const r = (raw ?? {}) as { n?: number; mode?: 'one' | 'all' }
    const n = r.n ?? nQueens.meta.defaultN
    const mode = r.mode ?? 'all'
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
      return { ok: false as const, issues: [{ field: 'n', reason: '须为正整数' }] }
    }
    return { ok: true as const, value: { n, mode } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('nQueens', v.issues)
    const { n, mode } = v.value as { n: number; mode: 'one' | 'all' }
    const { result, steps } = nQueens.solveNQueens(n, mode)
    return {
      trace: wrapLegacySteps('nQueens', nQueens.meta as AlgoMeta, steps, v.value),
      result,
    }
  },
}

const matrixChainTyped: RegistryEntry = {
  id: 'matrixChain',
  meta: matrixChain.meta as AlgoMeta,
  generateSteps: matrixChain.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown) {
    const r = (raw ?? {}) as { dims?: number[] }
    const dims = r.dims ?? matrixChain.meta.defaultDims
    if (!Array.isArray(dims) || dims.length < 2) {
      return { ok: false as const, issues: [{ field: 'dims', reason: '至少 2 个维度（1 个矩阵）' }] }
    }
    if (!dims.every((d) => typeof d === 'number' && d > 0)) {
      return { ok: false as const, issues: [{ field: 'dims', reason: '维度须为正数' }] }
    }
    return { ok: true as const, value: { dims } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('matrixChain', v.issues)
    const { dims } = v.value as { dims: number[] }
    const { result, steps } = matrixChain.solveMatrixChain(dims)
    return {
      trace: wrapLegacySteps('matrixChain', matrixChain.meta as AlgoMeta, steps, v.value),
      result,
    }
  },
}

const huffmanTyped: RegistryEntry = {
  id: 'huffman',
  meta: huffman.meta as AlgoMeta,
  generateSteps: huffman.generateSteps as AlgoModule['generateSteps'],
  validate(raw: unknown) {
    const r = (raw ?? {}) as { symbols?: string[]; freqs?: number[] }
    const symbols = r.symbols ?? huffman.meta.defaultSymbols
    const freqs = r.freqs ?? huffman.meta.defaultFreqs
    if (!Array.isArray(symbols) || !Array.isArray(freqs) || symbols.length !== freqs.length) {
      return { ok: false as const, issues: [{ field: 'symbols/freqs', reason: '须等长数组' }] }
    }
    return { ok: true as const, value: { symbols, freqs } }
  },
  solve(input: unknown) {
    const v = this.validate!(input)
    if (!v.ok) return validationFail('huffman', v.issues)
    const { symbols, freqs } = v.value as { symbols: string[]; freqs: number[] }
    const { result, steps } = huffman.solveHuffman(symbols, freqs)
    return {
      trace: wrapLegacySteps('huffman', huffman.meta as AlgoMeta, steps, v.value),
      result,
    }
  },
}

const maxSubarrayDCTyped = makeArrayAlgo('maxSubarrayDC', maxSubarrayDC, { allowEmpty: true })

const sortIds = ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'] as const
const sortMods = {
  bubbleSort,
  insertionSort,
  mergeSort,
  quickSort,
} as const

const typedEntries: Record<string, RegistryEntry> = {
  knapsack01: knapsackTyped,
  lcs: lcsTyped,
  dijkstra: dijkstraTyped,
  kadane: kadaneTyped,
  binarySearch: binarySearchTyped,
  kmp: kmpTyped,
  editDistance: editDistanceTyped,
  kruskal: kruskalTyped,
  prim: primTyped,
  bellmanFord: bellmanFordTyped,
  floyd: floydTyped,
  bfs: bfsTyped,
  activitySelection: activityTyped,
  nQueens: nQueensTyped,
  matrixChain: matrixChainTyped,
  huffman: huffmanTyped,
  maxSubarrayDC: maxSubarrayDCTyped,
}

for (const sid of sortIds) {
  typedEntries[sid] = makeArrayAlgo(sid, sortMods[sid])
}

/** Typed + legacy registry. Pages may keep using algorithms from index.ts. */
export const registry: Record<string, RegistryEntry> = {
  ...Object.fromEntries(
    Object.entries(legacyAlgorithms).map(([id, mod]) => [
      id,
      { id, meta: mod.meta, generateSteps: mod.generateSteps },
    ]),
  ),
  ...typedEntries,
}

export function getAlgo(id: string): RegistryEntry | undefined {
  return registry[id]
}

export function hasTypedSolve(id: string): boolean {
  return Boolean(registry[id]?.solve)
}
