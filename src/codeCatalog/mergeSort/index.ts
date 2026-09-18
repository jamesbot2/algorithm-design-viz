import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Merge sort \u2014 complete TypeScript reference (in-place merge, L/R/k). */\nexport function mergeSort(a: number[]): number[] {\n  const arr = a.slice()\n  sort(arr, 0, arr.length - 1)\n  return arr\n}\nfunction sort(a: number[], L: number, R: number): void {\n  if (L >= R) return\n  const mid = Math.floor((L + R) / 2)\n  sort(a, L, mid)\n  sort(a, mid + 1, R)\n  merge(a, L, mid, R)\n}\nfunction merge(a: number[], L: number, mid: number, R: number): void {\n  const left = a.slice(L, mid + 1)\n  const right = a.slice(mid + 1, R + 1)\n  let i = 0\n  let j = 0\n  let k = L\n  while (i < left.length && j < right.length) {\n    if (left[i]! <= right[j]!) a[k++] = left[i++]!\n    else a[k++] = right[j++]!\n  }\n  while (i < left.length) a[k++] = left[i++]!\n  while (j < right.length) a[k++] = right[j++]!\n}\n"

export const MERGE_SORT_TS_HASH = "a19ec7fa3af79e7c102e20cdf9a5a5171f06997d8e6bf0379498a9cff6e85758"

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
    "range": { "startLine": 21, "endLine": 21 }
  },
  {
    "id": "mergeWriteRight",
    "label": "写入右半",
    "range": { "startLine": 22, "endLine": 22 }
  },
  {
    "id": "mergeCopyLeft",
    "label": "拷贝剩余左半",
    "range": { "startLine": 24, "endLine": 24 }
  },
  {
    "id": "mergeCopyRight",
    "label": "拷贝剩余右半",
    "range": { "startLine": 25, "endLine": 25 }
  },
  {
    "id": "done",
    "label": "返回排序结果",
    "range": { "startLine": 5, "endLine": 5 }
  },
  {
    "id": "return",
    "label": "返回",
    "range": { "startLine": 5, "endLine": 5 }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function merge_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
