import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = `/** Quick sort (Lomuto, i = L-1 style) — TypeScript reference aligned with generateSteps. */
export function quickSort(a: number[]): number[] {
  const arr = a.slice()
  qs(arr, 0, arr.length - 1)
  return arr
}
function qs(arr: number[], L: number, R: number): void {
  if (L >= R) return
  const p = partition(arr, L, R)
  qs(arr, L, p - 1)
  qs(arr, p + 1, R)
}
function partition(arr: number[], L: number, R: number): number {
  const pivot = arr[R]!
  let i = L - 1
  for (let j = L; j < R; j++) {
    if (arr[j]! <= pivot) {
      i++
      const t = arr[i]!; arr[i] = arr[j]!; arr[j] = t
    }
  }
  const p = i + 1
  const t = arr[p]!; arr[p] = arr[R]!; arr[R] = t
  return p
}
`

export const QUICK_SORT_TS_HASH =
  '33cf084d3257c52ad25002fa0b3c6dd881a3feeb9d9faac2a76d8cf3d9ebfca4'

export function getQUICK_SORTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: 'quickSort.ts',
    language: 'typescript',
    title: '快速排序 (TypeScript)',
    source: TS_SOURCE,
    sourceHash: QUICK_SORT_TS_HASH,
    anchors: [
      { id: 'partition', label: '选 pivot', range: { startLine: 14, endLine: 14 } },
      { id: 'compare', label: '与 pivot 比较', range: { startLine: 17, endLine: 17 } },
      { id: 'loopSwap', label: '循环内交换', range: { startLine: 18, endLine: 19 } },
      { id: 'swap', label: '交换（兼容）', range: { startLine: 18, endLine: 19 } },
      { id: 'pivotPlace', label: '枢轴就位', range: { startLine: 22, endLine: 23 } },
      { id: 'recurse', label: '递归分区', range: { startLine: 9, endLine: 11 } },
      { id: 'done', label: '返回排序结果', range: { startLine: 5, endLine: 5 } },
      { id: 'return', label: '返回', range: { startLine: 5, endLine: 5 } },
    ],
  }
  return { typescript }
}

export function quick_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
