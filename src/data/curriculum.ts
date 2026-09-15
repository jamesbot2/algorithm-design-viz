/**
 * Dual navigation: by design paradigm（设计思想）and by problem type（问题类型）.
 * Completion flags are honest — only mark what is actually implemented.
 */
export type CompletionFlag = {
  theory: boolean
  demo: boolean
  practice: boolean
}

export interface NavModule {
  id: string
  title: string
  /** Algo ids or teaching page ids */
  items: string[]
  /** Optional free-form notes */
  note?: string
  completion?: CompletionFlag
  /** Prerequisite algo/module ids */
  prereqs?: string[]
  planned?: boolean
}

export interface NavGroup {
  id: string
  title: string
  modules: NavModule[]
}

/** 按设计思想 */
export const byDesignThought: NavGroup = {
  id: 'by-design',
  title: '按设计思想',
  modules: [
    {
      id: 'intro',
      title: '绪论与复杂度',
      items: ['bubbleSort', 'insertionSort', 'binarySearch'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'divide',
      title: '分治',
      items: ['mergeSort', 'quickSort', 'maxSubarrayDC', 'binarySearch'],
      completion: { theory: true, demo: true, practice: false },
      note: '拓展规划：Strassen、最近点对',
    },
    {
      id: 'dp',
      title: '动态规划',
      items: ['kadane', 'knapsack01', 'lcs', 'editDistance', 'matrixChain'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'greedy',
      title: '贪心',
      items: ['activitySelection', 'huffman'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'backtrack',
      title: '回溯与分支限界',
      items: ['nQueens', 'knapsack01'],
      completion: { theory: true, demo: true, practice: true },
      note: '背包多策略见教学页 /teach/knapsack',
    },
    {
      id: 'graph',
      title: '图算法',
      items: ['bfs', 'dijkstra', 'bellmanFord', 'floyd', 'kruskal', 'prim'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'flow',
      title: '网络流',
      items: ['bfs'],
      prereqs: ['bfs'],
      completion: { theory: true, demo: false, practice: false },
      note: 'BFS 为最大流（Edmonds-Karp）先修；最大流演示规划中，非已完成',
      planned: true,
    },
    {
      id: 'string',
      title: '字符串',
      items: ['kmp'],
      completion: { theory: true, demo: true, practice: false },
    },
  ],
}

/** 按问题类型 */
export const byProblemType: NavGroup = {
  id: 'by-problem',
  title: '按问题类型',
  modules: [
    {
      id: 'sorting',
      title: '排序',
      items: ['bubbleSort', 'insertionSort', 'mergeSort', 'quickSort'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'search',
      title: '查找',
      items: ['binarySearch'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'subarray',
      title: '最大子数组',
      items: ['kadane', 'maxSubarrayDC'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'knapsack-family',
      title: '背包问题族',
      items: ['knapsack01'],
      completion: { theory: true, demo: true, practice: true },
      note: '多策略教学单元 /teach/knapsack',
    },
    {
      id: 'seq-align',
      title: '序列对齐',
      items: ['lcs', 'editDistance'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'spanning',
      title: '最小生成树',
      items: ['kruskal', 'prim'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'shortest',
      title: '最短路',
      items: ['dijkstra', 'bellmanFord', 'floyd'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'matching-pattern',
      title: '模式匹配',
      items: ['kmp'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'combinatorial',
      title: '组合搜索',
      items: ['nQueens'],
      completion: { theory: true, demo: true, practice: true },
    },
    {
      id: 'coding',
      title: '编码与压缩',
      items: ['huffman'],
      completion: { theory: true, demo: true, practice: false },
    },
    {
      id: 'matrix-opt',
      title: '矩阵链优化',
      items: ['matrixChain'],
      completion: { theory: true, demo: true, practice: false },
    },
  ],
}

export const EXTENDED_PLANNED = [
  'Edmonds-Karp 最大流',
  'Strassen 矩阵乘法',
  '平面最近点对',
] as const

export function completionLabel(c?: CompletionFlag): string {
  if (!c) return '—'
  const parts: string[] = []
  if (c.theory) parts.push('理论')
  if (c.demo) parts.push('演示')
  if (c.practice) parts.push('练习')
  if (!parts.length) return '未开放'
  return parts.join('/')
}
