import type { Step } from '../types/step'
import * as bubbleSort from './bubbleSort'
import * as insertionSort from './insertionSort'
import * as mergeSort from './mergeSort'
import * as quickSort from './quickSort'
import * as binarySearch from './binarySearch'
import * as kadane from './kadane'
import * as knapsack01 from './knapsack01'
import * as lcs from './lcs'
import * as editDistance from './editDistance'
import * as activitySelection from './activitySelection'
import * as bfs from './bfs'
import * as dijkstra from './dijkstra'
import * as kruskal from './kruskal'
import * as bellmanFord from './bellmanFord'
import * as floyd from './floyd'
import * as kmp from './kmp'
import * as prim from './prim'

export interface AlgoMeta {
  id: string
  title: string
  complexity: string
  description: string
  code?: string
  [key: string]: unknown
}

export interface AlgoModule {
  meta: AlgoMeta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateSteps: (input: number[], ...args: any[]) => Step[]
}

export const algorithms: Record<string, AlgoModule> = {
  bubbleSort: bubbleSort as AlgoModule,
  insertionSort: insertionSort as AlgoModule,
  mergeSort: mergeSort as AlgoModule,
  quickSort: quickSort as AlgoModule,
  binarySearch: binarySearch as AlgoModule,
  kadane: kadane as AlgoModule,
  knapsack01: knapsack01 as AlgoModule,
  lcs: lcs as AlgoModule,
  editDistance: editDistance as AlgoModule,
  activitySelection: activitySelection as AlgoModule,
  bfs: bfs as AlgoModule,
  dijkstra: dijkstra as AlgoModule,
  kruskal: kruskal as AlgoModule,
  bellmanFord: bellmanFord as AlgoModule,
  floyd: floyd as AlgoModule,
  kmp: kmp as AlgoModule,
  prim: prim as AlgoModule,
}

export const algoList = Object.values(algorithms)
