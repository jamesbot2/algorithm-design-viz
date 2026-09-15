import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Huffman coding — complete TypeScript reference. */\nexport type HNode = { ch?: string; freq: number; left?: HNode; right?: HNode }\nexport function huffman(symbols: string[], freqs: number[]): HNode | null {\n  const nodes: HNode[] = symbols.map((ch, i) => ({ ch, freq: freqs[i]! }))\n  if (!nodes.length) return null\n  while (nodes.length > 1) {\n    nodes.sort((a, b) => a.freq - b.freq)\n    const a = nodes.shift()!\n    const b = nodes.shift()!\n    nodes.push({ freq: a.freq + b.freq, left: a, right: b })\n  }\n  return nodes[0]!\n}\n"

export const HUFFMAN_TS_HASH = "2dbe8f9043ce0beb07501c1ab72c422911ee3ec484080a2a8a82e79709494b48"

export function getHUFFMANCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "huffman.ts",
    language: 'typescript',
    title: "Huffman (TypeScript)",
    source: TS_SOURCE,
    sourceHash: HUFFMAN_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "建叶节点",
    "range": {
      "startLine": 4,
      "endLine": 4
    }
  },
  {
    "id": "sort",
    "label": "按频率排序",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "merge",
    "label": "合并最小两棵",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "done",
    "label": "返回根",
    "range": {
      "startLine": 12,
      "endLine": 12
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function huffmanSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
