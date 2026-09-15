import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Kadane max subarray — complete TypeScript reference. */\nexport function kadane(a: number[]): { best: number; start: number; end: number } {\n  if (a.length === 0) return { best: 0, start: 0, end: -1 }\n  let best = a[0]!\n  let cur = a[0]!\n  let start = 0\n  let end = 0\n  let curStart = 0\n  for (let i = 1; i < a.length; i++) {\n    if (cur + a[i]! < a[i]!) {\n      cur = a[i]!\n      curStart = i\n    } else {\n      cur = cur + a[i]!\n    }\n    if (cur > best) {\n      best = cur\n      start = curStart\n      end = i\n    }\n  }\n  return { best, start, end }\n}\n"

export const KADANE_TS_HASH = "8589ff2b4a6467de154bdf3c4b2f6fd90ea50f425d8ccdc87bf9fe3e66b8d48f"

export function getKADANECatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "kadane.ts",
    language: 'typescript',
    title: "Kadane 最大子数组 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KADANE_TS_HASH,
    anchors: [
  {
    "id": "init",
    "label": "初始化",
    "range": {
      "startLine": 4,
      "endLine": 4
    }
  },
  {
    "id": "extendOrReset",
    "label": "延伸或重置",
    "range": {
      "startLine": 10,
      "endLine": 10
    }
  },
  {
    "id": "updateBest",
    "label": "更新最优",
    "range": {
      "startLine": 16,
      "endLine": 16
    }
  },
  {
    "id": "done",
    "label": "返回",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function kadaneSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
