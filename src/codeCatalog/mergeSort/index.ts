import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = `/** Merge sort — complete TypeScript reference (in-place merge, L/R/k). */
export function mergeSort(a: number[]): number[] {
  const arr = a.slice()
  sort(arr, 0, arr.length - 1)
  return arr
}
function sort(a: number[], L: number, R: number): void {
  if (L >= R) return
  const mid = Math.floor((L + R) / 2)
  sort(a, L, mid)
  sort(a, mid + 1, R)
  merge(a, L, mid, R)
}
function merge(a: number[], L: number, mid: number, R: number): void {
  const left = a.slice(L, mid + 1)
  const right = a.slice(mid + 1, R + 1)
  let i = 0
  let j = 0
  let k = L
  while (i < left.length && j < right.length) {
    if (left[i]! <= right[j]!) {
      a[k] = left[i]!
      i++
      k++
    } else {
      a[k] = right[j]!
      j++
      k++
    }
  }
  while (i < left.length) {
    a[k] = left[i]!
    i++
    k++
  }
  while (j < right.length) {
    a[k] = right[j]!
    j++
    k++
  }
}
`

export const MERGE_SORT_TS_HASH = "404fc80e4ab70bd0b12fda5c36cf482a622bd22b96c5e435d16034a7e0524708"

export function getMERGE_SORTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "mergeSort.ts",
    language: 'typescript',
    title: "归并排序 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: MERGE_SORT_TS_HASH,
    anchors: [
  {
    "id": "return",
    "label": "区间长度 ≤ 1 返回",
    "range": { "startLine": 8, "endLine": 8 }
  },
  {
    "id": "divide",
    "label": "划分 mid",
    "range": { "startLine": 9, "endLine": 9 }
  },
  {
    "id": "recurse",
    "label": "递归左右",
    "range": { "startLine": 10, "endLine": 11 }
  },
  {
    "id": "mergeCompare",
    "label": "归并比较",
    "range": { "startLine": 21, "endLine": 21 }
  },
  {
    "id": "mergeWriteLeft",
    "label": "写入左半",
    "range": { "startLine": 22, "endLine": 22 }
  },
  {
    "id": "mergeWriteRight",
    "label": "写入右半",
    "range": { "startLine": 26, "endLine": 26 }
  },
  {
    "id": "mergeCopyLeft",
    "label": "拷贝剩余左半",
    "range": { "startLine": 32, "endLine": 32 }
  },
  {
    "id": "mergeCopyRight",
    "label": "拷贝剩余右半",
    "range": { "startLine": 37, "endLine": 37 }
  },
  {
    "id": "done",
    "label": "返回排序结果",
    "range": { "startLine": 5, "endLine": 5 }
  },
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function merge_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
