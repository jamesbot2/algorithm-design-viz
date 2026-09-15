import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Insertion sort — complete TypeScript reference. */\nexport function insertionSort(a: number[]): number[] {\n  const arr = a.slice()\n  for (let i = 1; i < arr.length; i++) {\n    const key = arr[i]!\n    let j = i - 1\n    while (j >= 0 && arr[j]! > key) {\n      arr[j + 1] = arr[j]!\n      j--\n    }\n    arr[j + 1] = key\n  }\n  return arr\n}\n"

export const INSERTION_SORT_TS_HASH = "26be8ab17a28e5d28ba4fe274691f829c6d74a3066a36da726bed9f76a20ba69"

export function getINSERTION_SORTCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "insertionSort.ts",
    language: 'typescript',
    title: "插入排序 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: INSERTION_SORT_TS_HASH,
    anchors: [
  {
    "id": "outer",
    "label": "取 key",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "shift",
    "label": "右移",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "insert",
    "label": "插入 key",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 13,
      "endLine": 13
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function insertion_sortSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
