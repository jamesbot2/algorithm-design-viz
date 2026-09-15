export * from './types'
export * from './hash'
export {
  getDijkstraCatalog,
  dijkstraSourceHashShort,
  DIJKSTRA_TS_HASH,
  DIJKSTRA_PSEUDO_HASH,
} from './dijkstra'
export { getKnapsackCatalog, type KnapsackStrategyId } from './knapsack'

import type { CodeDocument } from './types'
import { getDijkstraCatalog } from './dijkstra'
import { getBUBBLE_SORTCatalog } from './bubbleSort'
import { getINSERTION_SORTCatalog } from './insertionSort'
import { getMERGE_SORTCatalog } from './mergeSort'
import { getQUICK_SORTCatalog } from './quickSort'
import { getBINARY_SEARCHCatalog } from './binarySearch'
import { getKADANECatalog } from './kadane'
import { getMAX_SUBARRAY_DCCatalog } from './maxSubarrayDC'
import { getLCSCatalog } from './lcs'
import { getN_QUEENSCatalog } from './nQueens'
import { getEDIT_DISTANCECatalog } from './editDistance'
import { getKMPCatalog } from './kmp'
import { getBFSCatalog } from './bfs'
import { getDIJKSTRA_HEAPCatalog } from './dijkstraHeap'
import { getKRUSKALCatalog } from './kruskal'
import { getPRIMCatalog } from './prim'
import { getBELLMAN_FORDCatalog } from './bellmanFord'
import { getFLOYDCatalog } from './floyd'
import { getMATRIX_CHAINCatalog } from './matrixChain'
import { getHUFFMANCatalog } from './huffman'
import { getACTIVITY_SELECTIONCatalog } from './activitySelection'
import { getKnapsackCatalog, type KnapsackStrategyId } from './knapsack'

export type CatalogBundle = {
  typescript: CodeDocument
  pseudocode?: CodeDocument
}

/**
 * Look up CodeDocument catalog by algorithm id (or knapsack.<strategy>).
 * Returns null when no catalog is registered.
 */
export function getCatalog(algoId: string): CatalogBundle | null {
  switch (algoId) {
    case 'dijkstra':
      return getDijkstraCatalog()
    case 'dijkstraHeap':
      return getDIJKSTRA_HEAPCatalog()
    case 'bubbleSort':
      return getBUBBLE_SORTCatalog()
    case 'insertionSort':
      return getINSERTION_SORTCatalog()
    case 'mergeSort':
      return getMERGE_SORTCatalog()
    case 'quickSort':
      return getQUICK_SORTCatalog()
    case 'binarySearch':
      return getBINARY_SEARCHCatalog()
    case 'kadane':
      return getKADANECatalog()
    case 'maxSubarrayDC':
      return getMAX_SUBARRAY_DCCatalog()
    case 'lcs':
      return getLCSCatalog()
    case 'nQueens':
      return getN_QUEENSCatalog()
    case 'editDistance':
      return getEDIT_DISTANCECatalog()
    case 'kmp':
      return getKMPCatalog()
    case 'bfs':
      return getBFSCatalog()
    case 'kruskal':
      return getKRUSKALCatalog()
    case 'prim':
      return getPRIMCatalog()
    case 'bellmanFord':
      return getBELLMAN_FORDCatalog()
    case 'floyd':
      return getFLOYDCatalog()
    case 'matrixChain':
      return getMATRIX_CHAINCatalog()
    case 'huffman':
      return getHUFFMANCatalog()
    case 'activitySelection':
      return getACTIVITY_SELECTIONCatalog()
    case 'knapsack01':
    case 'knapsack.dp2d':
      return getKnapsackCatalog('dp2d')
    case 'knapsack.dp1dCorrect':
      return getKnapsackCatalog('dp1dCorrect')
    case 'knapsack.dp1dWrong':
      return getKnapsackCatalog('dp1dWrong')
    case 'knapsack.brute':
    case 'knapsack.bruteForce':
      return getKnapsackCatalog('brute')
    case 'knapsack.backtracking':
      return getKnapsackCatalog('backtracking')
    case 'knapsack.branchAndBound':
      return getKnapsackCatalog('branchAndBound')
    case 'knapsack.greedy':
      return getKnapsackCatalog('greedy')
    default: {
      if (algoId.startsWith('knapsack.')) {
        const s = algoId.slice('knapsack.'.length) as KnapsackStrategyId
        return getKnapsackCatalog(s)
      }
      return null
    }
  }
}

/** All primary algo ids that have a catalog (for coverage matrix / tests). */
export const CATALOG_ALGO_IDS = [
  'dijkstra',
  'dijkstraHeap',
  'bubbleSort',
  'insertionSort',
  'mergeSort',
  'quickSort',
  'binarySearch',
  'kadane',
  'maxSubarrayDC',
  'lcs',
  'nQueens',
  'editDistance',
  'kmp',
  'bfs',
  'kruskal',
  'prim',
  'bellmanFord',
  'floyd',
  'matrixChain',
  'huffman',
  'activitySelection',
  'knapsack01',
  'knapsack.dp2d',
  'knapsack.dp1dCorrect',
  'knapsack.dp1dWrong',
  'knapsack.brute',
  'knapsack.backtracking',
  'knapsack.branchAndBound',
  'knapsack.greedy',
] as const
