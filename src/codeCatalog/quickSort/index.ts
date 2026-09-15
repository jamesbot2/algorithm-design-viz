import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Quick sort (Lomuto) — complete TypeScript reference. */\nexport function quickSort(a: number[]): number[] {\n  const arr = a.slice()\n  qs(arr, 0, arr.length - 1)\n  return arr\n}\nfunction qs(arr: number[], lo: number, hi: number): void {\n  if (lo >= hi) return\n  const p = partition(arr, lo, hi)\n  qs(arr, lo, p - 1)\n  qs(arr, p + 1, hi)\n}\nfunction partition(arr: number[], lo: number, hi: number): number {\n  const pivot = arr[hi]!\n  let i = lo\n  for (let j = lo; j < hi; j++) {\n    if (arr[j]! <= pivot) {\n      const t = arr[i]!; arr[i] = arr[j]!; arr[j] = t\n      i++\n    }\n  }\n  const t = arr[i]!; arr[i] = arr[hi]!; arr[hi] = t\n  return i\n}\n"

export const QUICK_SORT_TS_HASH = "2042eaaeb1d7df998e3ea2213bf79a3f0a37a9fb176e10ae9e4c76f48d91dc49"

export function getQUICK_SORTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "quickSort.ts",
    language: 'typescript',
    title: "快速排序 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: QUICK_SORT_TS_HASH,
    anchors: [
  {
    "id": "partition",
    "label": "选 pivot",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  },
  {
    "id": "compare",
    "label": "与 pivot 比较",
    "range": {
      "startLine": 17,
      "endLine": 17
    }
  },
  {
    "id": "swap",
    "label": "交换",
    "range": {
      "startLine": 18,
      "endLine": 18
    }
  },
  {
    "id": "recurse",
    "label": "递归分区",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function quick_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
