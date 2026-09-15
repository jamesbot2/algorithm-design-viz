import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** Activity selection (greedy by finish) — complete TypeScript reference. */\nexport function activitySelection(\n  activities: { id: string; start: number; finish: number }[],\n): string[] {\n  const sorted = activities.slice().sort((a, b) => a.finish - b.finish)\n  const picked: string[] = []\n  let lastFinish = -Infinity\n  for (const act of sorted) {\n    if (act.start >= lastFinish) {\n      picked.push(act.id)\n      lastFinish = act.finish\n    }\n  }\n  return picked\n}\n"

export const ACTIVITY_SELECTION_TS_HASH = "f12d32da44e2e1836319e10e9e68f74d0467549adcd7d50217eed4f8afb3e99b"

export function getACTIVITY_SELECTIONCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "activitySelection.ts",
    language: 'typescript',
    title: "活动选择 (TypeScript)",
    source: TS_SOURCE,
    sourceHash: ACTIVITY_SELECTION_TS_HASH,
    anchors: [
  {
    "id": "sort",
    "label": "按结束时间排序",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "check",
    "label": "检查相容",
    "range": {
      "startLine": 9,
      "endLine": 9
    }
  },
  {
    "id": "pick",
    "label": "选取活动",
    "range": {
      "startLine": 10,
      "endLine": 10
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

export function activity_selectionSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
