import type { ExperimentResult, ExperimentRow } from './types'
import { solveDijkstraNaive } from '../algorithms/dijkstra'
import { solveDijkstraHeap } from '../algorithms/dijkstraHeap'
import { solveDp2d } from '../algorithms/knapsack/dp2d'
import { greedyByDensity } from '../algorithms/knapsack/greedy'
import { bruteForceKnapsack } from '../algorithms/knapsack/bruteForce'
import { solveBacktracking } from '../algorithms/knapsack/backtracking'
import { solveBranchAndBound } from '../algorithms/knapsack/branchAndBound'
import type { KnapsackInstance } from '../algorithms/knapsack/types'
import * as kadane from '../algorithms/kadane'
import * as maxSubarrayDC from '../algorithms/maxSubarrayDC'

const EXP_CAPS = {
  knapsackItems: 18,
  knapsackBruteItems: 16,
  arrayLen: 2000,
  graphN: 80,
  graphEdges: 400,
} as const

function randomArray(n: number, seed: number): number[] {
  let s = seed >>> 0
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out.push((s % 21) - 10)
  }
  return out
}

function randomGraph(n: number, m: number, seed: number): [number, number, number][] {
  let s = seed >>> 0
  const edges: [number, number, number][] = []
  const seen = new Set<string>()
  let guard = 0
  while (edges.length < m && guard++ < m * 20) {
    s = (s * 1664525 + 1013904223) >>> 0
    const u = s % n
    s = (s * 1664525 + 1013904223) >>> 0
    const v = s % n
    if (u === v) continue
    const key = `${u}->${v}`
    if (seen.has(key)) continue
    seen.add(key)
    s = (s * 1664525 + 1013904223) >>> 0
    edges.push([u, v, 1 + (s % 20)])
  }
  return edges
}

/** Kadane core ops — not visualization step count. */
export function countKadaneOps(a: number[]): {
  comparisons: number
  scans: number
  best: number | null
} {
  if (a.length === 0) return { comparisons: 0, scans: 0, best: null }
  let best = a[0]!
  let cur = a[0]!
  let comparisons = 0
  let scans = 1
  for (let i = 1; i < a.length; i++) {
    scans++
    comparisons++ // cur+a[i] vs a[i]
    if (cur + a[i]! < a[i]!) cur = a[i]!
    else cur = cur + a[i]!
    comparisons++ // cur vs best
    if (cur > best) best = cur
  }
  return { comparisons, scans, best }
}

/** Divide-and-conquer max subarray core ops. */
export function countMaxSubDcOps(a: number[]): {
  comparisons: number
  scans: number
  best: number | null
} {
  if (a.length === 0) return { comparisons: 0, scans: 0, best: null }
  let comparisons = 0
  let scans = 0

  function crossing(lo: number, mid: number, hi: number): number {
    let leftSum = -Infinity
    let sum = 0
    for (let i = mid; i >= lo; i--) {
      scans++
      sum += a[i]!
      comparisons++
      if (sum > leftSum) leftSum = sum
    }
    let rightSum = -Infinity
    sum = 0
    for (let j = mid + 1; j <= hi; j++) {
      scans++
      sum += a[j]!
      comparisons++
      if (sum > rightSum) rightSum = sum
    }
    return leftSum + rightSum
  }

  function maxSub(lo: number, hi: number): number {
    if (lo === hi) {
      scans++
      return a[lo]!
    }
    const mid = Math.floor((lo + hi) / 2)
    const L = maxSub(lo, mid)
    const R = maxSub(mid + 1, hi)
    const C = crossing(lo, mid, hi)
    comparisons += 2 // pick max of three
    return Math.max(L, R, C)
  }

  return { comparisons, scans, best: maxSub(0, a.length - 1) }
}

/** O(n²) brute max subarray with real op counts. */
export function countMaxSubBruteOps(a: number[]): {
  comparisons: number
  scans: number
  best: number | null
} {
  if (a.length === 0) return { comparisons: 0, scans: 0, best: null }
  let best = -Infinity
  let comparisons = 0
  let scans = 0
  for (let i = 0; i < a.length; i++) {
    let sum = 0
    for (let j = i; j < a.length; j++) {
      scans++
      sum += a[j]!
      comparisons++
      if (sum > best) best = sum
    }
  }
  return { comparisons, scans, best }
}

/** Operation counters only — not wall-clock as complexity proof. */
export function runMaxSubarrayCompare(sizes: number[], seed = 1): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = [
    'metric=comparisons/scans 为算法核心操作计数，不是 DOM/墙钟证明',
    'metric=vizSteps 为「可视化步骤量」，与算法工作量不同，勿混用',
  ]
  for (const n of sizes) {
    if (n > EXP_CAPS.arrayLen) continue
    const arr = randomArray(n, seed + n)
    const kOps = countKadaneOps(arr)
    const dOps = countMaxSubDcOps(arr)
    const bOps = n <= 400 ? countMaxSubBruteOps(arr) : null
    const kViz = kadane.generateSteps(arr).length
    const dViz = maxSubarrayDC.generateSteps(arr).length

    rows.push({
      experiment: 'max-subarray',
      method: 'kadane',
      n,
      metric: 'comparisons',
      value: kOps.comparisons,
      extra: { scans: kOps.scans, best: kOps.best },
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'kadane',
      n,
      metric: 'scans',
      value: kOps.scans,
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'kadane',
      n,
      metric: 'vizSteps',
      value: kViz,
      extra: { label: '可视化步骤量' },
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'divide-conquer',
      n,
      metric: 'comparisons',
      value: dOps.comparisons,
      extra: { scans: dOps.scans, best: dOps.best },
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'divide-conquer',
      n,
      metric: 'scans',
      value: dOps.scans,
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'divide-conquer',
      n,
      metric: 'vizSteps',
      value: dViz,
      extra: { label: '可视化步骤量' },
    })
    if (bOps) {
      rows.push({
        experiment: 'max-subarray',
        method: 'brute-n2',
        n,
        metric: 'comparisons',
        value: bOps.comparisons,
        extra: { scans: bOps.scans, best: bOps.best },
      })
      rows.push({
        experiment: 'max-subarray',
        method: 'brute-n2',
        n,
        metric: 'scans',
        value: bOps.scans,
      })
    }
  }
  return { rows, notes }
}

export function runKnapsackStrategiesCompare(itemCounts: number[], seed = 2): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = [
    `暴力法物品数上限 ${EXP_CAPS.knapsackBruteItems}（指数）`,
    'dpStates / btNodes / prunedNodes / scans 为真实计数；vizSteps=可视化步骤量（若有）',
    '比较最优值一致性；非墙钟复杂度证明',
  ]
  for (const n of itemCounts) {
    if (n > EXP_CAPS.knapsackItems) continue
    let s = (seed + n) >>> 0
    const items = Array.from({ length: n }, (_, i) => {
      s = (s * 1664525 + 1013904223) >>> 0
      const weight = 1 + (s % 8)
      s = (s * 1664525 + 1013904223) >>> 0
      const value = 1 + (s % 15)
      return { id: String(i), weight, value }
    })
    const capacity = Math.max(5, Math.floor(n * 3))
    const inst: KnapsackInstance = { items, capacity }

    const dpPack = solveDp2d(inst)
    const dp = dpPack.solution
    const dpStates = (n + 1) * (capacity + 1)
    const greedy = greedyByDensity(inst)

    rows.push({
      experiment: 'knapsack',
      method: 'dp2d',
      n,
      metric: 'maxValue',
      value: dp.maxValue,
      extra: { capacity, dpStates },
    })
    rows.push({
      experiment: 'knapsack',
      method: 'dp2d',
      n,
      metric: 'dpStates',
      value: dpStates,
      extra: { capacity },
    })
    rows.push({
      experiment: 'knapsack',
      method: 'dp2d',
      n,
      metric: 'vizSteps',
      value: dpPack.steps.length,
      extra: { label: '可视化步骤量' },
    })
    rows.push({
      experiment: 'knapsack',
      method: 'greedyDensity',
      n,
      metric: 'maxValue',
      value: greedy.maxValue,
      extra: { capacity, gap: dp.maxValue - greedy.maxValue, scans: n },
    })
    rows.push({
      experiment: 'knapsack',
      method: 'greedyDensity',
      n,
      metric: 'scans',
      value: n,
    })

    if (n <= 12) {
      const bt = solveBacktracking(inst, { maxNodes: 50_000 })
      const btNodes = Number(bt.steps[0]?.vars?.nodes ?? 0)
      rows.push({
        experiment: 'knapsack',
        method: 'backtracking',
        n,
        metric: 'btNodes',
        value: btNodes,
        extra: { maxValue: bt.solution.maxValue, agreeDp: bt.solution.maxValue === dp.maxValue },
      })
      const bb = solveBranchAndBound(inst)
      const pruned = countPruned(bb.tree)
      const bbNodes = countNodes(bb.tree)
      rows.push({
        experiment: 'knapsack',
        method: 'branchAndBound',
        n,
        metric: 'btNodes',
        value: bbNodes,
        extra: { prunedNodes: pruned, maxValue: bb.solution.maxValue },
      })
      rows.push({
        experiment: 'knapsack',
        method: 'branchAndBound',
        n,
        metric: 'prunedNodes',
        value: pruned,
      })
    }

    if (n <= EXP_CAPS.knapsackBruteItems) {
      const brute = bruteForceKnapsack(inst)
      const subsets = 1 << n
      rows.push({
        experiment: 'knapsack',
        method: 'brute',
        n,
        metric: 'maxValue',
        value: brute.maxValue,
        extra: { agreeDp: brute.maxValue === dp.maxValue, subsets },
      })
      rows.push({
        experiment: 'knapsack',
        method: 'brute',
        n,
        metric: 'scans',
        value: subsets,
        extra: { note: 'subset masks examined' },
      })
    }
  }
  return { rows, notes }
}

function countPruned(node: { status?: string; children?: unknown[] }): number {
  let c = node.status === 'pruned' || node.status === 'rejected' ? 1 : 0
  for (const ch of node.children ?? []) {
    c += countPruned(ch as { status?: string; children?: unknown[] })
  }
  return c
}

function countNodes(node: { children?: unknown[] }): number {
  let c = 1
  for (const ch of node.children ?? []) {
    c += countNodes(ch as { children?: unknown[] })
  }
  return c
}

export function runDijkstraCompare(sizes: { n: number; m: number }[], seed = 3): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = [
    'naive.scans = 选点扫描次数；heap.pops / staleSkips / relaxes 为堆操作计数',
    '验证同一图上 dist 一致；禁止用浏览器计时充当复杂度证明',
    '若导出含 vizSteps，其为可视化步骤量，非算法工作量',
  ]
  for (const { n, m } of sizes) {
    if (n > EXP_CAPS.graphN || m > EXP_CAPS.graphEdges) continue
    const edges = randomGraph(n, m, seed + n * 17 + m)
    const naive = solveDijkstraNaive(edges, n, 0)
    const heap = solveDijkstraHeap(edges, n, 0)
    const agree =
      naive.ok && heap.ok && JSON.stringify(naive.dist) === JSON.stringify(heap.dist)
    rows.push({
      experiment: 'dijkstra',
      method: 'naive',
      n,
      metric: 'scans',
      value: naive.scans,
      extra: { m, agree },
    })
    rows.push({
      experiment: 'dijkstra',
      method: 'heap',
      n,
      metric: 'heapPops',
      value: heap.pops,
      extra: { m, staleSkips: heap.staleSkips, relaxations: heap.relaxes, agree },
    })
    rows.push({
      experiment: 'dijkstra',
      method: 'heap',
      n,
      metric: 'staleSkips',
      value: heap.staleSkips,
      extra: { m },
    })
    rows.push({
      experiment: 'dijkstra',
      method: 'heap',
      n,
      metric: 'relaxations',
      value: heap.relaxes,
      extra: { m },
    })
  }
  return { rows, notes }
}

export function exportExperimentCsv(rows: ExperimentRow[]): string {
  const header = 'experiment,method,n,metric,value,extra_json'
  const lines = rows.map((r) => {
    const extra = r.extra ? JSON.stringify(r.extra).replace(/"/g, '""') : ''
    return `${r.experiment},${r.method},${r.n},${r.metric},${r.value},"${extra}"`
  })
  return [header, ...lines].join('\n')
}

export function exportExperimentJson(result: ExperimentResult): string {
  return JSON.stringify(result, null, 2)
}
