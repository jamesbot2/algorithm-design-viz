import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Max subarray divide-and-conquer — complete TypeScript reference. */\nexport function maxSubarrayDC(a: number[]): number {\n  function solve(lo: number, hi: number): number {\n    if (lo === hi) return a[lo]!\n    const mid = (lo + hi) >> 1\n    const left = solve(lo, mid)\n    const right = solve(mid + 1, hi)\n    const cross = crossing(lo, mid, hi)\n    return Math.max(left, right, cross)\n  }\n  function crossing(lo: number, mid: number, hi: number): number {\n    let leftSum = -Infinity\n    let s = 0\n    for (let i = mid; i >= lo; i--) {\n      s += a[i]!\n      if (s > leftSum) leftSum = s\n    }\n    let rightSum = -Infinity\n    s = 0\n    for (let i = mid + 1; i <= hi; i++) {\n      s += a[i]!\n      if (s > rightSum) rightSum = s\n    }\n    return leftSum + rightSum\n  }\n  if (a.length === 0) return 0\n  return solve(0, a.length - 1)\n}\n"

export const MAX_SUBARRAY_DC_TS_HASH = "334383687c4d89ea5e9a50fa8c2c091c3826cffcc92b17223ee7b0b4282cc83a"

export function getMAX_SUBARRAY_DCCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "maxSubarrayDC.ts",
    language: 'typescript',
    title: "最大子数组分治 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: MAX_SUBARRAY_DC_TS_HASH,
    anchors: [
  {
    "id": "base",
    "label": "递归边界",
    "range": {
      "startLine": 4,
      "endLine": 4
    }
  },
  {
    "id": "divide",
    "label": "划分",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "cross",
    "label": "跨越中点",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "combine",
    "label": "取最大",
    "range": {
      "startLine": 9,
      "endLine": 9
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function max_subarray_dcSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
