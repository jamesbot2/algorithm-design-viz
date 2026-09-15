import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Merge sort — complete TypeScript reference. */\nexport function mergeSort(a: number[]): number[] {\n  if (a.length <= 1) return a.slice()\n  const mid = Math.floor(a.length / 2)\n  const left = mergeSort(a.slice(0, mid))\n  const right = mergeSort(a.slice(mid))\n  return merge(left, right)\n}\nfunction merge(left: number[], right: number[]): number[] {\n  const out: number[] = []\n  let i = 0\n  let j = 0\n  while (i < left.length && j < right.length) {\n    if (left[i]! <= right[j]!) out.push(left[i++]!)\n    else out.push(right[j++]!)\n  }\n  while (i < left.length) out.push(left[i++]!)\n  while (j < right.length) out.push(right[j++]!)\n  return out\n}\n"

export const MERGE_SORT_TS_HASH = "71df6eabf85036ca0c7f12959124477f54342e1e837a1bc6642a45b8c35efbdf"

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
    "range": {
      "startLine": 4,
      "endLine": 4
    }
  },
  {
    "id": "recurse",
    "label": "递归左右",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "mergeCompare",
    "label": "归并比较",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  },
  {
    "id": "mergePush",
    "label": "归并写入",
    "range": {
      "startLine": 15,
      "endLine": 15
    }
  },
  {
    "id": "done",
    "label": "返回排序结果",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function merge_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
