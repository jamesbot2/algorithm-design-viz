import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Floyd-Warshall — complete TypeScript reference. */\nexport function floyd(dist: number[][]): number[][] {\n  const n = dist.length\n  const d = dist.map((r) => r.slice())\n  for (let k = 0; k < n; k++) {\n    for (let i = 0; i < n; i++) {\n      for (let j = 0; j < n; j++) {\n        if (d[i]![k]! + d[k]![j]! < d[i]![j]!) {\n          d[i]![j] = d[i]![k]! + d[k]![j]!\n        }\n      }\n    }\n  }\n  return d\n}\n"

export const FLOYD_TS_HASH = "f8c676ce1125880a4d2ee49976bb2a0baf81dde20e0ec2db17b4d0988dba6d8c"

export function getFLOYDCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "floyd.ts",
    language: 'typescript',
    title: "Floyd-Warshall (TypeScript)",
    source: TS_SOURCE,
    sourceHash: FLOYD_TS_HASH,
    anchors: [
  {
    "id": "kLoop",
    "label": "中间点 k",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "relax",
    "label": "松弛 i→j",
    "range": {
      "startLine": 8,
      "endLine": 8
    }
  },
  {
    "id": "update",
    "label": "更新",
    "range": {
      "startLine": 9,
      "endLine": 9
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
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function floydSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
