import type { Step } from '../types/step'

export const meta = {
  id: 'huffman',
  title: 'Huffman 编码',
  complexity: '时间 O(n log n)，空间 O(n)',
  description:
    '按频率合并最小两棵树构造前缀码。频率须为正；并列时按符号字典序稳定打破平局。输出 WPL。',
  code: `while >1 trees:
  take two min-freq
  merge as parent`,
  defaultSymbols: ['a', 'b', 'c', 'd', 'e'],
  defaultFreqs: [5, 9, 12, 13, 16],
  implName: 'huffmanDeterministic',
  implVersion: '1.0.0',
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  inputAssumptions: '正频率；空→WPL=0；单符号→码长 0、WPL=0',
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
  // deterministic tie-break: prefer lexicographically smaller id
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
    out[node.symbol] = prefix || '0' // single node convention: still assign '0' for display? Spec says code length 0 for single
    if (prefix === '') out[node.symbol] = '' // empty code for single symbol
    return
  }
  if (node.left) assignCodes(node.left, prefix + '0', out)
  if (node.right) assignCodes(node.right, prefix + '1', out)
}

export interface HuffmanResult {
  ok: boolean
  wpl: number
  codes: Record<string, string>
  empty?: boolean
  single?: boolean
}

export function solveHuffman(
  symbols: string[],
  freqs: number[],
): { result: HuffmanResult; steps: Step[] } {
  const steps: Step[] = []
  let id = 0
  const snap = (message: string, vars: Record<string, string | number | boolean | null> = {}, result?: unknown) => {
    steps.push({
      id: id++,
      message,
      arrays: { symbols: [...symbols], freqs: [...freqs] },
      vars,
      result,
    })
  }

  if (symbols.length !== freqs.length) {
    const result = { ok: false, wpl: 0, codes: {} }
    snap('符号与频率长度不一致', {}, result)
    return { result, steps }
  }
  if (freqs.some((f) => typeof f !== 'number' || f <= 0 || !Number.isFinite(f))) {
    const result = { ok: false, wpl: 0, codes: {} }
    snap('频率须为正有限数', {}, result)
    return { result, steps }
  }
  if (symbols.length === 0) {
    const result: HuffmanResult = { ok: true, wpl: 0, codes: {}, empty: true }
    snap('空输入约定：WPL=0', {}, result)
    return { result, steps }
  }
  if (symbols.length === 1) {
    const result: HuffmanResult = {
      ok: true,
      wpl: 0,
      codes: { [symbols[0]!]: '' },
      single: true,
    }
    snap(`单符号约定：码为空串，WPL=0（符号 ${symbols[0]}）`, {}, result)
    return { result, steps }
  }

  let seq = 0
  let forest: HNode[] = symbols.map((s, i) => ({
    id: `L:${s}`,
    symbol: s,
    freq: freqs[i]!,
  }))
  forest.sort(cmpNode)
  snap(`初始森林（按 freq、id 排序）: ${forest.map((n) => `${n.symbol}:${n.freq}`).join(', ')}`)

  while (forest.length > 1) {
    forest.sort(cmpNode)
    const a = forest.shift()!
    const b = forest.shift()!
    const parent: HNode = {
      id: `M${seq++}`,
      freq: a.freq + b.freq,
      left: a,
      right: b,
    }
    forest.push(parent)
    snap(`合并 ${a.id}(${a.freq}) + ${b.id}(${b.freq}) → ${parent.id}(${parent.freq})`, {
      merged: parent.freq,
      remain: forest.length,
    })
  }

  const root = forest[0]!
  const codes: Record<string, string> = {}
  assignCodes(root, '', codes)
  const wpl = wplOf(root, 0)
  const result: HuffmanResult = { ok: true, wpl, codes }
  snap(
    `完成：WPL=${wpl}；码表 ${Object.entries(codes)
      .map(([s, c]) => `${s}=${c || 'ε'}`)
      .join(', ')}`,
    { wpl },
    result,
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
