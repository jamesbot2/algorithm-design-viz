import type { ExperimentResult, ExperimentRow } from './types'
import { solveDijkstraNaive } from '../algorithms/dijkstra'
import { solveDijkstraHeap } from '../algorithms/dijkstraHeap'
import { solveDp2d } from '../algorithms/knapsack/dp2d'
import { greedyByDensity } from '../algorithms/knapsack/greedy'
import { bruteForceKnapsack } from '../algorithms/knapsack/bruteForce'
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

/** Operation counters only — not wall-clock as complexity proof. */
export function runMaxSubarrayCompare(sizes: number[], seed = 1): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = ['计数为算法操作代理（比较/扫描），非 DOM/墙钟复杂度证明']
  for (const n of sizes) {
    if (n > EXP_CAPS.arrayLen) continue
    const arr = randomArray(n, seed + n)
    const kSteps = kadane.generateSteps(arr)
    const dSteps = maxSubarrayDC.generateSteps(arr)
    rows.push({
      experiment: 'max-subarray',
      method: 'kadane',
      n,
      metric: 'steps',
      value: kSteps.length,
    })
    rows.push({
      experiment: 'max-subarray',
      method: 'divide-conquer',
      n,
      metric: 'steps',
      value: dSteps.length,
    })
  }
  return { rows, notes }
}

export function runKnapsackStrategiesCompare(itemCounts: number[], seed = 2): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = [
    `暴力法物品数上限 ${EXP_CAPS.knapsackBruteItems}（指数）`,
    '比较最优值一致性与方法标记，非墙钟',
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
    const dp = solveDp2d(inst).solution
    const greedy = greedyByDensity(inst)
    rows.push({
      experiment: 'knapsack',
      method: 'dp2d',
      n,
      metric: 'maxValue',
      value: dp.maxValue,
      extra: { capacity },
    })
    rows.push({
      experiment: 'knapsack',
      method: 'greedyDensity',
      n,
      metric: 'maxValue',
      value: greedy.maxValue,
      extra: { capacity, gap: dp.maxValue - greedy.maxValue },
    })
    if (n <= EXP_CAPS.knapsackBruteItems) {
      const brute = bruteForceKnapsack(inst)
      rows.push({
        experiment: 'knapsack',
        method: 'brute',
        n,
        metric: 'maxValue',
        value: brute.maxValue,
        extra: { agreeDp: brute.maxValue === dp.maxValue },
      })
    }
  }
  return { rows, notes }
}

export function runDijkstraCompare(sizes: { n: number; m: number }[], seed = 3): ExperimentResult {
  const rows: ExperimentRow[] = []
  const notes = [
    'naive.scans = 选点扫描次数；heap.pops/staleSkips/relaxes 为堆操作计数',
    '验证同一图上 dist 一致；禁止用浏览器计时充当复杂度证明',
  ]
  for (const { n, m } of sizes) {
    if (n > EXP_CAPS.graphN || m > EXP_CAPS.graphEdges) continue
    const edges = randomGraph(n, m, seed + n * 17 + m)
    const naive = solveDijkstraNaive(edges, n, 0)
    const heap = solveDijkstraHeap(edges, n, 0)
    const agree =
      naive.ok &&
      heap.ok &&
      JSON.stringify(naive.dist) === JSON.stringify(heap.dist)
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
      metric: 'pops',
      value: heap.pops,
      extra: { m, staleSkips: heap.staleSkips, relaxes: heap.relaxes, agree },
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
