import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Binary search (lower-bound style) — complete TypeScript reference. */\nexport function binarySearch(a: number[], target: number): number {\n  let lo = 0\n  let hi = a.length - 1\n  while (lo <= hi) {\n    const mid = lo + ((hi - lo) >> 1)\n    if (a[mid]! === target) return mid\n    if (a[mid]! < target) lo = mid + 1\n    else hi = mid - 1\n  }\n  return -1\n}\n"

export const BINARY_SEARCH_TS_HASH = "09bb463db8c727fab066f3691c08486e6b3244b17937850f65ee84662e3d2541"

export function getBINARY_SEARCHCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "binarySearch.ts",
    language: 'typescript',
    title: "二分查找 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: BINARY_SEARCH_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化 lo/hi",
    "range": {
      "startLine": 3,
      "endLine": 3
    }
  },
  {
    "id": "mid",
    "label": "取 mid",
    "range": {
      "startLine": 6,
      "endLine": 6
    }
  },
  {
    "id": "compare",
    "label": "比较 target",
    "range": {
      "startLine": 7,
      "endLine": 7
    }
  },
  {
    "id": "narrow",
    "label": "收缩区间",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "miss",
    "label": "未找到",
    "range": {
      "startLine": 11,
      "endLine": 11
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function binary_searchSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
