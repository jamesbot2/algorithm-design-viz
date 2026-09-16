import type { SearchTreeNode, Step } from '../types/step'
import { snapshotTree } from '../utils/cloneTree'

export const meta = {
  id: 'huffman',
  title: 'Huffman 编码',
  complexity: '时间 O(n log n)，空间 O(n)',
  description:
    '按频率合并最小两棵树构造前缀码。频率须为正；并列时按符号字典序稳定打破平局。输出 WPL。重复符号拒绝或聚合。',
  code: `while >1 trees:
  take two min-freq
  merge as parent`,
  defaultSymbols: ['a', 'b', 'c', 'd', 'e'],
  defaultFreqs: [5, 9, 12, 13, 16],
  implName: 'huffmanDeterministic',
  implVersion: '1.1.0',
  timeComplexity: 'O(n log n) with heap; this demo uses sort+shift each round (O(n² log n))',
  spaceComplexity: 'O(n)',
  inputAssumptions: '正频率；空→WPL=0；单符号→码长 0、WPL=0；重复符号须聚合',
}

interface HNode {
  id: string
  symbol?: string
  freq: number
  left?: HNode
  right?: HNode
}

function cmpNode(a: HNode, b: HNode): number {
  if (a.freq !== b.freq) return a.freq - b.freq
  return a.id.localeCompare(b.id)
}

function wplOf(node: HNode, depth: number): number {
  if (!node.left && !node.right) {
    return node.symbol !== undefined ? node.freq * depth : 0
  }
  return (node.left ? wplOf(node.left, depth + 1) : 0) + (node.right ? wplOf(node.right, depth + 1) : 0)
}

function assignCodes(node: HNode, prefix: string, out: Record<string, string>) {
  if (!node.left && !node.right && node.symbol !== undefined) {
    out[node.symbol] = prefix === '' ? '' : prefix
    return
  }
  if (node.left) assignCodes(node.left, prefix + '0', out)
  if (node.right) assignCodes(node.right, prefix + '1', out)
}

function toSearchTree(node: HNode): SearchTreeNode {
  return {
    id: node.id,
    label: node.symbol !== undefined ? `${node.symbol}:${node.freq}` : `⊕${node.freq}`,
    status: node.left || node.right ? 'feasible' : 'optimal',
    children: [
      ...(node.left ? [toSearchTree(node.left)] : []),
      ...(node.right ? [toSearchTree(node.right)] : []),
    ],
    meta: { freq: node.freq, ...(node.symbol !== undefined ? { symbol: node.symbol } : {}) },
  }
}

function forestToForestTree(forest: HNode[]): SearchTreeNode {
  return {
    id: 'huff-forest',
    label: `森林 (${forest.length})`,
    status: 'root',
    children: forest.map(toSearchTree),
  }
}

export interface HuffmanResult {
  ok: boolean
  wpl: number
  codes: Record<string, string>
  empty?: boolean
  single?: boolean
  error?: string
  complexityNote?: string
}

export function solveHuffman(
  symbols: string[],
  freqs: number[],
  opts?: { onDuplicate?: 'reject' | 'aggregate' },
): { result: HuffmanResult; steps: Step[] } {
  const onDuplicate = opts?.onDuplicate ?? 'aggregate'
  const steps: Step[] = []
  const DOC = 'huffman.ts'
  const ref = (anchorId: string) => [{ documentId: DOC, anchorId }]
  let id = 0
  const snap = (
    message: string,
    vars: Record<string, string | number | boolean | null> = {},
    result?: unknown,
    codeRefs?: { documentId: string; anchorId: string }[],
    forest?: HNode[],
  ) => {
    steps.push({
      id: id++,
      message,
      arrays: { symbols: [...symbols], freqs: [...freqs] },
      vars,
      result,
      codeRefs: codeRefs ?? ref('init'),
      searchTree: forest ? snapshotTree(forestToForestTree(forest)) : undefined,
      phase: codeRefs?.[0]?.anchorId,
    })
  }

  if (symbols.length !== freqs.length) {
    const result = { ok: false, wpl: 0, codes: {}, error: 'length_mismatch' }
    snap('符号与频率长度不一致', {}, result, ref('init'))
    return { result, steps }
  }
  if (freqs.some((f) => typeof f !== 'number' || f <= 0 || !Number.isFinite(f))) {
    const result = { ok: false, wpl: 0, codes: {}, error: 'bad_freq' }
    snap('频率须为正有限数', {}, result, ref('init'))
    return { result, steps }
  }

  // Duplicate symbols: reject or aggregate frequencies
  const seen = new Map<string, number>()
  for (let i = 0; i < symbols.length; i++) {
    const s = symbols[i]!
    if (seen.has(s)) {
      if (onDuplicate === 'reject') {
        const result = { ok: false, wpl: 0, codes: {}, error: 'duplicate_symbol' }
        snap(`拒绝重复符号「${s}」`, { symbol: s }, result, ref('init'))
        return { result, steps }
      }
      seen.set(s, seen.get(s)! + freqs[i]!)
    } else {
      seen.set(s, freqs[i]!)
    }
  }
  const aggSymbols = [...seen.keys()]
  const aggFreqs = aggSymbols.map((s) => seen.get(s)!)
  if (aggSymbols.length !== symbols.length) {
    symbols = aggSymbols
    freqs = aggFreqs
    snap(
      `已聚合重复符号 → ${symbols.map((s, i) => `${s}:${freqs[i]}`).join(', ')}`,
      { aggregated: true },
      undefined,
      ref('init'),
    )
  }

  if (symbols.length === 0) {
    const result: HuffmanResult = { ok: true, wpl: 0, codes: {}, empty: true }
    snap('空输入约定：WPL=0', {}, result, ref('done'))
    return { result, steps }
  }
  if (symbols.length === 1) {
    const result: HuffmanResult = {
      ok: true,
      wpl: 0,
      codes: { [symbols[0]!]: '' },
      single: true,
    }
    snap(`单符号约定：码为空串，WPL=0（符号 ${symbols[0]}）`, {}, result, ref('done'))
    return { result, steps }
  }

  let seq = 0
  let forest: HNode[] = symbols.map((s, i) => ({
    id: `L:${s}`,
    symbol: s,
    freq: freqs[i]!,
  }))
  forest.sort(cmpNode)
  // Honest complexity: demo uses sort+shift, not a binary heap
  snap(
    `初始森林（sort+shift 演示，非堆）：${forest.map((n) => `${n.symbol}:${n.freq}`).join(', ')}`,
    { remain: forest.length, method: 'sort+shift' },
    undefined,
    ref('sort'),
    forest,
  )

  while (forest.length > 1) {
    forest.sort(cmpNode)
    snap(
      `选取最小两棵（排序后队头）`,
      { remain: forest.length },
      undefined,
      ref('sort'),
      forest,
    )
    const a = forest.shift()!
    const b = forest.shift()!
    const parent: HNode = {
      id: `M${seq++}`,
      freq: a.freq + b.freq,
      left: a,
      right: b,
    }
    forest.push(parent)
    snap(
      `合并 ${a.id}(${a.freq}) + ${b.id}(${b.freq}) → ${parent.id}(${parent.freq})`,
      { merged: parent.freq, remain: forest.length },
      undefined,
      ref('merge'),
      forest,
    )
  }

  const root = forest[0]!
  const codes: Record<string, string> = {}
  assignCodes(root, '', codes)
  const wpl = wplOf(root, 0)
  const result: HuffmanResult = {
    ok: true,
    wpl,
    codes,
    complexityNote: 'WPL/codes from final tree; construction used sort+shift not heap',
  }
  snap(
    `完成：WPL=${wpl}；码表 ${Object.entries(codes)
      .map(([s, c]) => `${s}=${c || 'ε'}`)
      .join(', ')}`,
    { wpl },
    result,
    ref('done'),
    forest,
  )
  return { result, steps }
}

export function generateSteps(
  _arr: number[],
  symbols = meta.defaultSymbols,
  freqs = meta.defaultFreqs,
): Step[] {
  return solveHuffman(symbols, freqs).steps
}
