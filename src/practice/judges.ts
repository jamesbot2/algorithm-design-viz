import type { JudgeMode, JudgeResult } from './types'
import { solveDp2d } from '../algorithms/knapsack/dp2d'
import { greedyByDensity } from '../algorithms/knapsack/greedy'
import { bruteForceKnapsack } from '../algorithms/knapsack/bruteForce'
import type { KnapsackInstance } from '../algorithms/knapsack/types'
import { lcsLengthAndOneString, allLcsOfOptimalLength } from './lcsHelpers'
import { solveDijkstraNaive } from '../algorithms/dijkstra'

const GREEDY_CE_LIMITS = {
  maxItems: 12,
  maxWeight: 10_000,
  maxValue: 10_000,
  maxCapacity: 50_000,
} as const

/** Multi-answer: any optimal LCS string of optimal length. */
export function judgeLcsConstruct(answer: string, payload: { x: string; y: string }): JudgeResult {
  const a = answer.trim()
  const { length, one } = lcsLengthAndOneString(payload.x, payload.y)
  if (a.length !== length) {
    return { ok: false, message: `长度应为 ${length}（例如 ${one}）` }
  }
  const all = allLcsOfOptimalLength(payload.x, payload.y, length)
  if (all.has(a)) {
    return {
      ok: true,
      message: `正确：${a} 是一条最优 LCS`,
      note: all.size > 1 ? `另有 ${all.size - 1} 条等长最优 LCS` : undefined,
    }
  }
  return { ok: false, message: `不是 X、Y 的公共子序列，或非最优。参考：${one}` }
}

/** Knapsack: accept any subset with optimal value and feasible weight. */
export function judgeKnapsackSet(
  selectedCsv: string,
  payload: { weights: number[]; values: number[]; capacity: number },
): JudgeResult {
  const parts = selectedCsv
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const idxs = parts.map((p) => Number(p))
  if (idxs.some((x) => !Number.isInteger(x) || x < 0 || x >= payload.weights.length)) {
    return { ok: false, message: '下标须为合法物品编号（0-based）' }
  }
  const uniq = new Set(idxs)
  if (uniq.size !== idxs.length) return { ok: false, message: '物品不可重复' }
  let w = 0
  let v = 0
  for (const i of idxs) {
    w += payload.weights[i]!
    v += payload.values[i]!
  }
  if (w > payload.capacity) return { ok: false, message: `超重：${w} > ${payload.capacity}` }
  const inst = {
    items: payload.weights.map((w, i) => ({
      id: String(i),
      weight: w,
      value: payload.values[i]!,
    })),
    capacity: payload.capacity,
  }
  const opt = solveDp2d(inst).solution
  if (v !== opt.maxValue) {
    return { ok: false, message: `价值 ${v} 非最优（最优 ${opt.maxValue}）` }
  }
  return {
    ok: true,
    message: `正确：价值 ${v}，重量 ${w}`,
    note: '任意达到最优价值的可行子集均可',
  }
}

/** Equal-length shortest paths: path node list whose length equals dist. */
export function judgeEqualLengthPath(
  pathCsv: string,
  payload: { edges: [number, number, number][]; n: number; start: number; target: number },
): JudgeResult {
  const nodes = pathCsv
    .split(/[\s,→\->]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
  if (nodes.some((x) => !Number.isInteger(x))) return { ok: false, message: '路径须为顶点序列' }
  if (nodes[0] !== payload.start || nodes[nodes.length - 1] !== payload.target) {
    return { ok: false, message: `路径须从 ${payload.start} 到 ${payload.target}` }
  }
  const wmap = new Map<string, number>()
  for (const [u, v, w] of payload.edges) wmap.set(`${u}->${v}`, w)
  let cost = 0
  for (let i = 0; i < nodes.length - 1; i++) {
    const key = `${nodes[i]}->${nodes[i + 1]}`
    const w = wmap.get(key)
    if (w === undefined) return { ok: false, message: `不存在边 ${key}` }
    cost += w
  }
  const { dist } = solveDijkstraNaive(payload.edges, payload.n, payload.start)
  const opt = dist[payload.target]
  if (opt === null || opt === undefined) return { ok: false, message: '目标不可达' }
  if (cost !== opt) return { ok: false, message: `路径代价 ${cost} ≠ 最短路 ${opt}` }
  return { ok: true, message: `正确：代价 ${cost}`, note: '任意最短路径均可' }
}

/** MST alternate edges: edge list with same total weight as Kruskal MST when connected. */
export function judgeMstWeight(
  edgesText: string,
  payload: { edges: [number, number, number][]; n: number; optimalCost: number; treeEdges: number },
): JudgeResult {
  const lines = edgesText
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const picked: [number, number, number][] = []
  const allowed = new Map<string, number>()
  for (const [u, v, w] of payload.edges) {
    const a = Math.min(u, v)
    const b = Math.max(u, v)
    allowed.set(`${a}-${b}`, w)
  }
  for (const line of lines) {
    const nums = line.split(/[\s,]+/).map(Number)
    if (nums.length < 2) return { ok: false, message: `无法解析：${line}` }
    const u = nums[0]!
    const v = nums[1]!
    const a = Math.min(u, v)
    const b = Math.max(u, v)
    const w = allowed.get(`${a}-${b}`)
    if (w === undefined) return { ok: false, message: `边 ${a}-${b} 不在原图` }
    picked.push([a, b, w])
  }
  if (picked.length !== payload.treeEdges) {
    return { ok: false, message: `边数须为 ${payload.treeEdges}` }
  }
  const cost = picked.reduce((s, e) => s + e[2], 0)
  if (cost !== payload.optimalCost) {
    return { ok: false, message: `总权 ${cost} ≠ 最优 ${payload.optimalCost}` }
  }
  const parent = Array.from({ length: payload.n }, (_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))
  for (const [u, v] of picked) {
    const pu = find(u)
    const pv = find(v)
    if (pu === pv) return { ok: false, message: '成环，不是树' }
    parent[pu] = pv
  }
  return { ok: true, message: `正确：总权 ${cost}`, note: '权相同的交替 MST 边集可接受' }
}

export interface GreedyCeInstance {
  weights: number[]
  values: number[]
  capacity: number
}

/** Parse structured payload or text fields into a knapsack instance. */
export function parseGreedyCeInput(
  answer: string | Record<string, string>,
): { ok: true; value: GreedyCeInstance } | { ok: false; message: string } {
  if (typeof answer === 'object' && answer !== null) {
    const wRaw = answer.weights ?? answer.w ?? ''
    const vRaw = answer.values ?? answer.v ?? ''
    const cRaw = answer.capacity ?? answer.cap ?? answer.W ?? ''
    const weights = parseNumberList(wRaw)
    const values = parseNumberList(vRaw)
    const caps = parseNumberList(cRaw)
    if (!weights || !values) {
      return { ok: false, message: 'weights/values 须为非负整数列表（逗号或空格分隔）' }
    }
    if (!caps || caps.length !== 1) {
      return { ok: false, message: 'capacity 须为单个非负整数' }
    }
    return { ok: true, value: { weights, values, capacity: caps[0]! } }
  }

  const text = String(answer).trim()
  // weights=...; values=...; capacity=...
  const wMatch = text.match(/(?:weights?|w)\s*[=:]\s*([0-9,\s]+)/i)
  const vMatch = text.match(/(?:values?|v)\s*[=:]\s*([0-9,\s]+)/i)
  const cMatch = text.match(/(?:capacity|cap)\s*[=:]\s*(\d+)/i) || text.match(/\bW\s*[=:]\s*(\d+)/)
  if (wMatch && vMatch && cMatch) {
    const weights = parseNumberList(wMatch[1]!)
    const values = parseNumberList(vMatch[1]!)
    const capacity = Number(cMatch[1])
    if (!weights || !values || !Number.isInteger(capacity)) {
      return { ok: false, message: '无法解析 weights/values/capacity' }
    }
    return { ok: true, value: { weights, values, capacity } }
  }

  // Compact: w=10,20,30 v=60,100,120 cap=50
  const compact = text.match(
    /\bw\s*=\s*([0-9,\s]+)\s*v\s*=\s*([0-9,\s]+)\s*(?:cap|capacity)\s*=\s*(\d+)/i,
  )
  if (compact) {
    const weights = parseNumberList(compact[1]!)
    const values = parseNumberList(compact[2]!)
    const capacity = Number(compact[3])
    if (!weights || !values || !Number.isInteger(capacity)) {
      return { ok: false, message: '无法解析紧凑格式实例' }
    }
    return { ok: true, value: { weights, values, capacity } }
  }

  return {
    ok: false,
    message:
      '请提交结构化实例：weights、values、capacity（或文本 w=… v=… cap=…）。仅写随机数字不算反例。',
  }
}

function parseNumberList(raw: string): number[] | null {
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) return null
  const nums = parts.map(Number)
  if (nums.some((x) => !Number.isInteger(x) || x < 0 || !Number.isFinite(x))) return null
  return nums
}

function validateGreedyCeInstance(
  inst: GreedyCeInstance,
): { ok: true } | { ok: false; message: string } {
  const { weights, values, capacity } = inst
  if (weights.length !== values.length) {
    return { ok: false, message: `weights 长度 ${weights.length} ≠ values 长度 ${values.length}` }
  }
  if (weights.length === 0) return { ok: false, message: '至少一件物品' }
  if (weights.length > GREEDY_CE_LIMITS.maxItems) {
    return { ok: false, message: `物品数超过上限 ${GREEDY_CE_LIMITS.maxItems}` }
  }
  if (capacity < 0 || !Number.isInteger(capacity)) {
    return { ok: false, message: 'capacity 须为非负整数' }
  }
  if (capacity > GREEDY_CE_LIMITS.maxCapacity) {
    return { ok: false, message: `capacity 超过上限 ${GREEDY_CE_LIMITS.maxCapacity}` }
  }
  for (let i = 0; i < weights.length; i++) {
    if (weights[i]! > GREEDY_CE_LIMITS.maxWeight || values[i]! > GREEDY_CE_LIMITS.maxValue) {
      return {
        ok: false,
        message: `物品 ${i} 的 weight/value 超过演示上限`,
      }
    }
  }
  return { ok: true }
}

function optimal01Value(inst: KnapsackInstance): number {
  if (inst.items.length <= 16) {
    const brute = bruteForceKnapsack(inst, 16)
    if (brute.ok) return brute.maxValue
  }
  return solveDp2d(inst).solution.maxValue
}

/**
 * Structured judging for density-greedy counterexamples.
 * Pass ONLY if greedyValue < optimalValue on the submitted instance.
 */
export function judgeGreedyCounterexample(
  answer: string | Record<string, string>,
  _payload?: unknown,
): JudgeResult {
  const parsed = parseGreedyCeInput(answer)
  if (!parsed.ok) return { ok: false, message: parsed.message }

  const check = validateGreedyCeInstance(parsed.value)
  if (!check.ok) return { ok: false, message: check.message }

  const { weights, values, capacity } = parsed.value
  const inst: KnapsackInstance = {
    items: weights.map((w, i) => ({
      id: String(i),
      weight: w,
      value: values[i]!,
    })),
    capacity,
  }

  const greedy = greedyByDensity(inst)
  const optimalValue = optimal01Value(inst)
  const greedyValue = greedy.maxValue
  const gap = optimalValue - greedyValue
  const instanceDesc = `w=[${weights.join(',')}] v=[${values.join(',')}] W=${capacity}`

  if (greedyValue < optimalValue) {
    return {
      ok: true,
      message: `反例成立：${instanceDesc}；密度贪心=${greedyValue}，最优=${optimalValue}，缺口 gap=${gap}`,
      note: `贪心选中 [${(greedy.selectedIds ?? []).join(', ')}]`,
    }
  }

  return {
    ok: false,
    message: `不是反例：${instanceDesc}；密度贪心=${greedyValue}，最优=${optimalValue}，gap=${gap}（需 greedy < optimal）`,
  }
}

export function judgeByKey(
  key: string,
  answer: string | Record<string, string>,
  payload: unknown,
): JudgeResult {
  switch (key) {
    case 'lcs_construct':
      return judgeLcsConstruct(
        typeof answer === 'string' ? answer : (answer.lcs ?? ''),
        payload as { x: string; y: string },
      )
    case 'knapsack_set':
      return judgeKnapsackSet(
        typeof answer === 'string' ? answer : (answer.items ?? ''),
        payload as { weights: number[]; values: number[]; capacity: number },
      )
    case 'equal_path':
      return judgeEqualLengthPath(
        typeof answer === 'string' ? answer : (answer.path ?? ''),
        payload as {
          edges: [number, number, number][]
          n: number
          start: number
          target: number
        },
      )
    case 'mst_alt':
      return judgeMstWeight(
        typeof answer === 'string' ? answer : (answer.edges ?? ''),
        payload as {
          edges: [number, number, number][]
          n: number
          optimalCost: number
          treeEdges: number
        },
      )
    case 'greedy_ce':
      return judgeGreedyCounterexample(answer, payload)
    default:
      return { ok: false, message: `未知裁判 ${key}` }
  }
}

/**
 * Choice judging.
 * - single (default): exactly one selected id must be in acceptIds
 * - multiExact: selected set must equal acceptIds (order-insensitive)
 * Does NOT accept incomplete subsets of multiExact acceptIds.
 */
export function judgeChoices(
  selected: string[],
  acceptIds: string[],
  mode: JudgeMode = 'single',
): JudgeResult {
  if (selected.length === 0) return { ok: false, message: '请选择答案' }
  const accept = new Set(acceptIds)
  const sel = new Set(selected)

  if (mode === 'multiExact') {
    const exact =
      sel.size === accept.size && [...sel].every((s) => accept.has(s))
    if (exact) return { ok: true, message: '正确（完整多选命中）' }
    const incomplete =
      [...sel].every((s) => accept.has(s)) && sel.size < accept.size
    if (incomplete) {
      return { ok: false, message: '选项不完整：多选题须选中全部正确项' }
    }
    return { ok: false, message: '不正确，请对照讲解与步骤链接复盘' }
  }

  // single: exactly one selection, must be acceptable
  if (selected.length !== 1) {
    return { ok: false, message: '本题为单选，请只选一项' }
  }
  if (accept.has(selected[0]!)) {
    return {
      ok: true,
      message: '正确',
      note: acceptIds.length > 1 ? '存在多个可接受单选项' : undefined,
    }
  }
  return { ok: false, message: '不正确，请对照讲解与步骤链接复盘' }
}
