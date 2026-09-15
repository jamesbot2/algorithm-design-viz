export { getKNAPSACK_DP2DCatalog, KNAPSACK_DP2D_TS_HASH } from './dp2d'
export { getKNAPSACK_DP1D_CORRECTCatalog, KNAPSACK_DP1D_CORRECT_TS_HASH } from './dp1dCorrect'
export { getKNAPSACK_DP1D_WRONGCatalog, KNAPSACK_DP1D_WRONG_TS_HASH } from './dp1dWrong'
export { getKNAPSACK_BRUTECatalog, KNAPSACK_BRUTE_TS_HASH } from './brute'
export { getKNAPSACK_BTCatalog, KNAPSACK_BT_TS_HASH } from './backtracking'
export { getKNAPSACK_BBCatalog, KNAPSACK_BB_TS_HASH } from './branchAndBound'
export { getKNAPSACK_GREEDYCatalog, KNAPSACK_GREEDY_TS_HASH } from './greedy'

import type { CodeDocument } from '../types'
import { getKNAPSACK_DP2DCatalog } from './dp2d'
import { getKNAPSACK_DP1D_CORRECTCatalog } from './dp1dCorrect'
import { getKNAPSACK_DP1D_WRONGCatalog } from './dp1dWrong'
import { getKNAPSACK_BRUTECatalog } from './brute'
import { getKNAPSACK_BTCatalog } from './backtracking'
import { getKNAPSACK_BBCatalog } from './branchAndBound'
import { getKNAPSACK_GREEDYCatalog } from './greedy'

export type KnapsackStrategyId =
  | 'dp2d'
  | 'dp1dCorrect'
  | 'dp1dWrong'
  | 'brute'
  | 'backtracking'
  | 'branchAndBound'
  | 'greedy'

export function getKnapsackCatalog(
  strategy: KnapsackStrategyId,
): { typescript: CodeDocument; pseudocode?: CodeDocument } | null {
  switch (strategy) {
    case 'dp2d':
      return getKNAPSACK_DP2DCatalog()
    case 'dp1dCorrect':
      return getKNAPSACK_DP1D_CORRECTCatalog()
    case 'dp1dWrong':
      return getKNAPSACK_DP1D_WRONGCatalog()
    case 'brute':
      return getKNAPSACK_BRUTECatalog()
    case 'backtracking':
      return getKNAPSACK_BTCatalog()
    case 'branchAndBound':
      return getKNAPSACK_BBCatalog()
    case 'greedy':
      return getKNAPSACK_GREEDYCatalog()
    default:
      return null
  }
}
