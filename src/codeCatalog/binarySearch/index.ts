import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = `/** Binary search — leftmost (lower-bound style) TypeScript reference. */
export function binarySearch(a: number[], target: number): number {
  let lo = 0
  let hi = a.length - 1
  let candidate = -1
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1)
    if (a[mid]! === target) {
      candidate = mid
      hi = mid - 1
    } else if (a[mid]! < target) {
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return candidate
}
`

const PSEUDO_SOURCE = `lo ← 0, hi ← n-1, candidate ← -1
while lo ≤ hi:
  mid ← ⌊(lo+hi)/2⌋
  if a[mid] = target:
    candidate ← mid; hi ← mid-1   // continue left
  else if a[mid] < target:
    lo ← mid+1
  else:
    hi ← mid-1
return candidate`

export const BINARY_SEARCH_TS_HASH =
  '62ebc96b2cae58354c18af7372fbd2e75cf7b83385e6cc2a50234a2a4fcc95ef'
export const BINARY_SEARCH_PSEUDO_HASH =
  '4d0256a9184db5bd6a287a3a95a5488ed8082b73b4d685e9fcf56cd5ab2869fa'

export function getBINARY_SEARCHCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: 'binarySearch.ts',
    language: 'typescript',
    title: '二分查找 · 最左匹配 (TypeScript)',
    source: TS_SOURCE,
    sourceHash: BINARY_SEARCH_TS_HASH,
    anchors: [
      { id: 'init', label: '初始化 lo/hi/candidate', range: { startLine: 3, endLine: 5 } },
      { id: 'mid', label: '取 mid', range: { startLine: 7, endLine: 7 } },
      { id: 'equal', label: '相等 → 记候选并向左', range: { startLine: 8, endLine: 10 } },
      { id: 'less', label: 'a[mid] < target → lo', range: { startLine: 11, endLine: 12 } },
      { id: 'greater', label: 'a[mid] > target → hi', range: { startLine: 13, endLine: 14 } },
      { id: 'found', label: '返回候选', range: { startLine: 17, endLine: 17 } },
      { id: 'miss', label: '未找到 (candidate=-1)', range: { startLine: 17, endLine: 17 } },
    ],
  }
  const pseudocode: CodeDocument = {
    documentId: 'binarySearch.pseudo',
    language: 'pseudocode',
    title: '二分查找 · 最左匹配（伪代码）',
    source: PSEUDO_SOURCE,
    sourceHash: BINARY_SEARCH_PSEUDO_HASH,
    anchors: [
      { id: 'init', label: '初始化', range: { startLine: 1, endLine: 1 } },
      { id: 'mid', label: '取 mid', range: { startLine: 3, endLine: 3 } },
      { id: 'equal', label: '相等向左', range: { startLine: 4, endLine: 5 } },
      { id: 'less', label: '偏小', range: { startLine: 6, endLine: 7 } },
      { id: 'greater', label: '偏大', range: { startLine: 8, endLine: 9 } },
      { id: 'found', label: '返回', range: { startLine: 10, endLine: 10 } },
      { id: 'miss', label: '未找到', range: { startLine: 10, endLine: 10 } },
    ],
  }
  return { typescript, pseudocode }
}

export function binary_searchSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
