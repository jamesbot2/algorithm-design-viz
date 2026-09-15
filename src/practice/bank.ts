import type { PracticeItem } from './types'
import { mulberry32, pickIndex } from './rng'
import { GREEDY_COUNTEREXAMPLE } from '../algorithms/knapsack/types'
import { greedyByDensity } from '../algorithms/knapsack/greedy'
import { solveDp2d } from '../algorithms/knapsack/dp2d'

const STATIC: PracticeItem[] = [
  {
    id: 'knapsack-predict-1',
    algoId: 'knapsack01',
    type: 'predict_next',
    judgeMode: 'single',
    prompt:
      '0-1 背包：物品 (w,v)=(2,3),(3,4),(4,5)，容量 5。DP 填表时处理完前 2 件后，dp[2][5] 应为多少？',
    choices: [
      { id: 'a', label: '3' },
      { id: 'b', label: '4' },
      { id: 'c', label: '7' },
      { id: 'd', label: '5' },
    ],
    acceptIds: ['c'],
    explanation: '可选第2件+第1件：3+2=5 重量，价值 4+3=7；或只选一件。最优 7。',
    stepLink: { algoId: 'knapsack01', hint: 'teach/knapsack DP2D 填表' },
  },
  {
    id: 'knapsack-explain-1',
    algoId: 'knapsack01',
    type: 'explain_choice',
    judgeMode: 'single',
    prompt: '分支限界求解 0-1 背包时，为何可用分数背包上界剪枝？',
    choices: [
      { id: 'a', label: '分数上界 ≥ 任何整数可行解，故上界 < 当前最优可剪' },
      { id: 'b', label: '分数上界总是等于最优，可直接当答案' },
      { id: 'c', label: '剪枝只适用于负权图' },
      { id: 'd', label: '因为贪心密度总是最优' },
    ],
    acceptIds: ['a'],
    explanation: '松弛问题最优是原问题上界；若上界已不优于 incumbent，子树可剪。',
    stepLink: { algoId: 'knapsack01', hint: 'teach/knapsack B&B' },
  },
  {
    id: 'lcs-predict-1',
    algoId: 'lcs',
    type: 'predict_next',
    judgeMode: 'single',
    prompt: 'X=ABCBDAB，Y=BDCABA。若当前比较到 X 的 B 与 Y 的 B 匹配，下一步 dp 转移是？',
    choices: [
      { id: 'a', label: 'dp[i][j] = dp[i-1][j-1] + 1' },
      { id: 'b', label: 'dp[i][j] = dp[i-1][j] + 1' },
      { id: 'c', label: '强制跳过该匹配' },
      { id: 'd', label: 'dp[i][j] = 0' },
    ],
    acceptIds: ['a'],
    explanation: '字符相等时取左上 +1。',
    stepLink: { algoId: 'lcs', hint: 'LCS 匹配转移' },
  },
  {
    id: 'lcs-construct-1',
    algoId: 'lcs',
    type: 'counterexample',
    judgeMode: 'construct',
    prompt: '构造一条 X=ABCBDAB 与 Y=BDCABA 的最优 LCS 字符串（多解均可）。',
    fields: [{ id: 'lcs', label: 'LCS 串', placeholder: '如 BCBA' }],
    judgeKey: 'lcs_construct',
    judgePayload: { x: 'ABCBDAB', y: 'BDCABA' },
    explanation: '最优长度 4；例如 BCBA、BDAB、BCAB 等。',
    stepLink: { algoId: 'lcs', hint: '回溯重建' },
  },
  {
    id: 'dijkstra-predict-1',
    algoId: 'dijkstra',
    type: 'predict_next',
    judgeMode: 'single',
    prompt:
      '非负权有向图：0→1(1), 0→2(4), 1→2(2), 1→3(6), 2→3(3)，源 0。第一次选定源后，下一轮选出的顶点是？',
    choices: [
      { id: 'a', label: '1（dist=1）' },
      { id: 'b', label: '2（dist=4）' },
      { id: 'c', label: '3' },
      { id: 'd', label: '无法确定' },
    ],
    acceptIds: ['a'],
    explanation: '未确定中 dist 最小者为 1。',
    stepLink: { algoId: 'dijkstra', hint: 'extract-min' },
  },
  {
    id: 'dijkstra-path-1',
    algoId: 'dijkstra',
    type: 'counterexample',
    judgeMode: 'path',
    prompt: '同上图，给出 0 到 3 的一条最短路径（顶点序列，多解若等长代价均可）。',
    fields: [{ id: 'path', label: '路径', placeholder: '0 1 2 3' }],
    judgeKey: 'equal_path',
    judgePayload: {
      edges: [
        [0, 1, 1],
        [0, 2, 4],
        [1, 2, 2],
        [1, 3, 6],
        [2, 3, 3],
      ],
      n: 4,
      start: 0,
      target: 3,
    },
    explanation: '最短代价 6，例如 0→1→2→3。',
    stepLink: { algoId: 'dijkstra', hint: '结果面板点目标' },
  },
  {
    id: 'nqueens-predict-1',
    algoId: 'nQueens',
    type: 'predict_next',
    judgeMode: 'single',
    prompt: 'N=4 皇后，已在第 0 行放列 1。第 1 行哪些列会因攻击被剪？（0-based）',
    choices: [
      { id: 'a', label: '仅列 1' },
      { id: 'b', label: '列 0、1、2' },
      { id: 'c', label: '列 1 与 2（同列/对角线）——不完整' },
      { id: 'd', label: '全部列都安全' },
    ],
    acceptIds: ['b'],
    explanation:
      '已放 (0,1)：同列剪列1；主对角剪列2；反对角剪列0。故冲突列为 0,1,2；仅选「列1与2」不完整，不接受。',
    stepLink: { algoId: 'nQueens', hint: '攻击检测剪枝' },
  },
  {
    id: 'nqueens-multi-1',
    algoId: 'nQueens',
    type: 'predict_next',
    judgeMode: 'multiExact',
    prompt: 'N=4 时，下列哪些说法正确？（多选，须全选对）',
    choices: [
      { id: 'a', label: '解的个数为 2（不计旋转对称）' },
      { id: 'b', label: '每行恰好放一个皇后' },
      { id: 'c', label: 'n=2、n=3 无解' },
      { id: 'd', label: '可在 O(1) 时间求出全部解' },
    ],
    acceptIds: ['a', 'b', 'c'],
    explanation: 'a/b/c 正确；全解枚举为指数级，非 O(1)。',
    stepLink: { algoId: 'nQueens', hint: '计数与可行性' },
  },
  {
    id: 'nqueens-explain-1',
    algoId: 'nQueens',
    type: 'explain_choice',
    judgeMode: 'single',
    prompt: '回溯解 N 皇后时，为何在放置前检查列与对角线即可？',
    choices: [
      { id: 'a', label: '每行恰放一个，故只需禁同列与对角' },
      { id: 'b', label: '因为皇后不能走日字' },
      { id: 'c', label: '只需检查相邻行' },
      { id: 'd', label: '随机放置期望最优' },
    ],
    acceptIds: ['a'],
    explanation: '一行一皇后把行冲突消掉，剩余列与两条对角线。',
    stepLink: { algoId: 'nQueens', hint: '可行性剪枝' },
  },
  {
    id: 'greedy-vs-dp-1',
    algoId: 'knapsack01',
    type: 'explain_choice',
    judgeMode: 'single',
    prompt: '对 0-1 背包，按价值密度贪心为何不一定最优？',
    choices: [
      { id: 'a', label: '物品不可分割，局部密度高可能挤占更优组合' },
      { id: 'b', label: '贪心在所有组合优化上都最优' },
      { id: 'c', label: '因为 DP 更慢所以更优' },
      { id: 'd', label: '负权边导致' },
    ],
    acceptIds: ['a'],
    explanation: '经典反例：密度高的小件组合劣于两件大件（如 160 vs 220）。',
    stepLink: { algoId: 'knapsack01', hint: 'teach/knapsack 贪心反例' },
  },
  {
    id: 'greedy-ce-1',
    algoId: 'knapsack01',
    type: 'counterexample',
    judgeMode: 'construct',
    prompt:
      '构造一个使「按密度贪心」严格劣于最优的 0-1 背包实例（提交 weights / values / capacity）。',
    fields: [
      { id: 'weights', label: 'weights（逗号分隔非负整数）', placeholder: '10,20,30' },
      { id: 'values', label: 'values（逗号分隔非负整数）', placeholder: '60,100,120' },
      { id: 'capacity', label: 'capacity', placeholder: '50' },
    ],
    judgeKey: 'greedy_ce',
    judgePayload: (() => {
      const g = greedyByDensity(GREEDY_COUNTEREXAMPLE)
      const opt = solveDp2d(GREEDY_COUNTEREXAMPLE).solution
      return {
        hintExample: { weights: [10, 20, 30], values: [60, 100, 120], capacity: 50 },
        expectedMax: opt.maxValue,
        greedyValue: g.maxValue,
      }
    })(),
    explanation: '标准反例最优 220，密度贪心 160。判定：对本实例跑贪心与最优，须 greedy < optimal。',
    stepLink: { algoId: 'knapsack01', hint: 'GREEDY_COUNTEREXAMPLE' },
  },
  {
    id: 'mst-alt-1',
    algoId: 'kruskal',
    type: 'counterexample',
    judgeMode: 'setOptimal',
    prompt:
      '无向边：0-1(1), 0-2(1), 1-2(1), 1-3(2), 2-3(2)。给出一棵总权最优的生成树边集（每行 u v）。',
    fields: [{ id: 'edges', label: '树边', placeholder: '0 1\n0 2\n1 3' }],
    judgeKey: 'mst_alt',
    judgePayload: {
      edges: [
        [0, 1, 1],
        [0, 2, 1],
        [1, 2, 1],
        [1, 3, 2],
        [2, 3, 2],
      ],
      n: 4,
      optimalCost: 4,
      treeEdges: 3,
    },
    explanation: '最优总权 4；可选不同的权 1 三角形边之一。',
    stepLink: { algoId: 'kruskal', hint: 'MST 选边' },
  },
  {
    id: 'knapsack-set-1',
    algoId: 'knapsack01',
    type: 'counterexample',
    judgeMode: 'setOptimal',
    prompt: '物品 0:(2,3), 1:(3,4), 2:(4,5)，容量 5。给出一个最优选中集（物品下标，逗号分隔）。',
    fields: [{ id: 'items', label: '选中下标', placeholder: '0,1' }],
    judgeKey: 'knapsack_set',
    judgePayload: { weights: [2, 3, 4], values: [3, 4, 5], capacity: 5 },
    explanation: '最优价值 7，选 {0,1}。',
    stepLink: { algoId: 'knapsack01', hint: 'DP 回溯选中集' },
  },
]

export function listPracticeItems(): PracticeItem[] {
  return STATIC
}

export function getPracticeItem(id: string): PracticeItem | undefined {
  return STATIC.find((x) => x.id === id)
}

export function pickPracticeItem(seed: number, filterAlgo?: string): PracticeItem {
  const rand = mulberry32(seed)
  let pool = STATIC
  if (filterAlgo) pool = STATIC.filter((x) => x.algoId === filterAlgo)
  if (!pool.length) pool = STATIC
  const item = structuredClone(pool[pickIndex(rand, pool.length)]!)
  item.seed = seed
  return item
}
