/**
 * V23: human labels for trace fields shown in the Current-data region.
 * The raw code name stays visible next to the label (code ↔ data mapping),
 * and every raw field remains reachable under「全部字段」.
 */
export const FRIENDLY_LABELS: Record<string, string> = {
  front: '队首位置',
  head: '队首位置',
  queue: '队列',
  dist: '距离',
  dist_u: 'dist[u]',
  newDist: '候选距离',
  parent: '前驱',
  pred: '前驱',
  visited: '已访问',
  done: '已确定',
  order: '访问顺序',
  heapSize: '堆大小',
  staleSkips: '过期出堆',
  i: 'i',
  j: 'j',
  k: 'k',
  lo: '左边界',
  hi: '右边界',
  mid: '中点',
  target: '目标值',
  best: '当前最优',
  bestMask: '最优选择',
  mask: '选择掩码',
  item: '当前物品',
  W: '容量',
  capacity: '容量',
  pivot: '基准',
  key: '待插入值',
  temp: '临时值',
  sum: '当前和',
  maxSum: '最大和',
  curSum: '当前和',
  cost: '代价',
  queens: '已放皇后',
  row: '行',
  col: '列',
  frameId: '当前帧',
  error: '错误',
  note: '说明',
  truncated: '已截断',
  sorted: '已排序',
  nodes: '节点数',
  phase: '阶段',
  mode: '模式',
  callStack: '调用栈',
}

/** Low-frequency configuration — summarized in one line instead of equal pills. */
export const CONFIG_KEYS = new Set(['ready', 'n', 'start', 'directed', 'capacity', 'textLen', 'patternLen'])

type VarValue = string | number | boolean | null | undefined

/** Single-letter names that only mean "vertex / edge weight" on graph pages (w = capacity index in knapsack). */
export const GRAPH_LABELS: Record<string, string> = {
  u: '当前顶点',
  v: '邻居顶点',
  w: '边权',
}

export function friendlyLabel(key: string, graph = false): string {
  return (graph ? GRAPH_LABELS[key] : undefined) ?? FRIENDLY_LABELS[key] ?? key
}

/** e.g. "6 个顶点 · 起点 0 · 无向图 · 就绪" */
export function summarizeConfig(vars: Record<string, VarValue> | undefined, opts: { graph?: boolean } = {}): string {
  if (!vars) return ''
  const parts: string[] = []
  const isGraph = opts.graph || 'directed' in vars
  if (vars.n !== undefined && vars.n !== null) parts.push(isGraph ? `${vars.n} 个顶点` : `规模 n=${vars.n}`)
  if (vars.start !== undefined && vars.start !== null) parts.push(`起点 ${vars.start}`)
  if (vars.directed !== undefined && vars.directed !== null) parts.push(vars.directed ? '有向图' : '无向图')
  if (vars.capacity !== undefined && vars.capacity !== null) parts.push(`容量 ${vars.capacity}`)
  if (vars.textLen !== undefined) parts.push(`文本长 ${vars.textLen}`)
  if (vars.patternLen !== undefined) parts.push(`模式长 ${vars.patternLen}`)
  if (vars.ready === true) parts.push('就绪')
  return parts.join(' · ')
}
