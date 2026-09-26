import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

/**
 * V25-01: complete TypeScript reference for Kadane, aligned with generateSteps:
 * same variable names (cur / curStart / best / bestStart / bestEnd / i), same tie
 * rules (strict `<` → extend on tie, strict `>` → keep the earliest best), same
 * non-empty contract (empty input → null, i.e. hasSubarray=false / best=null).
 * Frames reference these anchors by id; numeric meta.code lines are never used here
 * (see NUMERIC_LINE_FALLBACK in ../index.ts).
 */
const TS_SOURCE = "/** Kadane max subarray (non-empty) — complete TypeScript reference. */\nexport function kadane(a: number[]): { best: number; start: number; end: number } | null {\n  if (a.length === 0) return null // 空输入：不存在非空子数组（不是和为 0 的子数组）\n  let best = a[0]!\n  let cur = a[0]!\n  let bestStart = 0\n  let bestEnd = 0\n  let curStart = 0\n  for (let i = 1; i < a.length; i++) {\n    if (cur + a[i]! < a[i]!) {\n      cur = a[i]!\n      curStart = i\n    } else {\n      cur = cur + a[i]!\n    }\n    if (cur > best) {\n      best = cur\n      bestStart = curStart\n      bestEnd = i\n    }\n  }\n  return { best, start: bestStart, end: bestEnd }\n}\n"

export const KADANE_TS_HASH = "2fbd8ff9d80976150860beb84d60e87defa9ec407b12e37a0896cbba9c27518e"

export function getKADANECatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "kadane.ts",
    language: "typescript",
    title: "Kadane 最大子数组 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KADANE_TS_HASH,
    anchors: [
      {
        "id": "emptyInput",
        "label": "空输入：无非空子数组",
        "range": {
          "startLine": 3,
          "endLine": 3
        }
      },
      {
        "id": "init",
        "label": "初始化 best/cur/端点",
        "range": {
          "startLine": 4,
          "endLine": 8
        }
      },
      {
        "id": "loopVisit",
        "label": "循环：考察 a[i]",
        "range": {
          "startLine": 9,
          "endLine": 9
        }
      },
      {
        "id": "chooseCond",
        "label": "判定：重置还是延伸",
        "range": {
          "startLine": 10,
          "endLine": 10
        }
      },
      {
        "id": "resetWrite",
        "label": "重置：cur ← a[i]，curStart ← i",
        "range": {
          "startLine": 11,
          "endLine": 12
        }
      },
      {
        "id": "extendWrite",
        "label": "延伸：cur ← cur + a[i]",
        "range": {
          "startLine": 14,
          "endLine": 14
        }
      },
      {
        "id": "bestCond",
        "label": "判定：cur > best",
        "range": {
          "startLine": 16,
          "endLine": 16
        }
      },
      {
        "id": "updateBest",
        "label": "更新最优：best/bestStart/bestEnd",
        "range": {
          "startLine": 17,
          "endLine": 19
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
  return { typescript }
}

export function kadaneSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
