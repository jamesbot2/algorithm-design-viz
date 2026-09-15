import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Bubble sort — complete TypeScript reference. */\nexport function bubbleSort(a: number[]): number[] {\n  const arr = a.slice()\n  const n = arr.length\n  for (let i = 0; i < n - 1; i++) {\n    for (let j = 0; j < n - 1 - i; j++) {\n      if (arr[j]! > arr[j + 1]!) {\n        const t = arr[j]!\n        arr[j] = arr[j + 1]!\n        arr[j + 1] = t\n      }\n    }\n  }\n  return arr\n}\n"

export const BUBBLE_SORT_TS_HASH = "c2124dd83c6f0ee44a76c7f5041023857261a9c938aa40f57de25c529d36f6cf"
export const BUBBLE_SORT_PSEUDO_HASH = "dc34b630da9c7206d204a40e53b94b7035acd39ecef3bf0ecefe60be0e3517ef"

export function getBUBBLE_SORTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "bubbleSort.ts",
    language: 'typescript',
    title: "冒泡排序 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: BUBBLE_SORT_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "外层循环",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "compare",
    "label": "比较相邻",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "swap",
    "label": "交换",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  }
,
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 14,
      "endLine": 14
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = {
    documentId: "bubbleSort.ts",
    language: 'pseudocode',
    title: "冒泡排序 (TypeScript)（伪代码）",
    source: "for i=0..n-2\n  for j=0..n-2-i\n    if a[j]>a[j+1]: swap",
    sourceHash: "dc34b630da9c7206d204a40e53b94b7035acd39ecef3bf0ecefe60be0e3517ef",
    anchors: [
  {
    "id": "init",
    "label": "外层",
    "range": {
      "startLine": 1,
      "endLine": 1
    }
  },
  {
    "id": "compare",
    "label": "比较",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  },
  {
    "id": "swap",
    "label": "交换",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  }
],
  }
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function bubble_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
