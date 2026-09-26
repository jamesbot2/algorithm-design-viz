import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** KMP string matching — complete TypeScript reference. */\nexport function kmpSearch(text: string, pattern: string): number[] {\n  const hits: number[] = []\n  if (!pattern) return [0]\n  const lps = buildLps(pattern)\n  let i = 0\n  let j = 0\n  while (i < text.length) {\n    if (text[i] === pattern[j]) {\n      i++\n      j++\n      if (j === pattern.length) {\n        hits.push(i - j)\n        j = lps[j - 1]!\n      }\n    } else if (j > 0) {\n      j = lps[j - 1]!\n    } else {\n      i++\n    }\n  }\n  return hits\n}\nfunction buildLps(pattern: string): number[] {\n  const lps = Array(pattern.length).fill(0)\n  let len = 0\n  let i = 1\n  while (i < pattern.length) {\n    if (pattern[i] === pattern[len]) {\n      len++\n      lps[i] = len\n      i++\n    } else if (len > 0) {\n      len = lps[len - 1]!\n    } else {\n      lps[i] = 0\n      i++\n    }\n  }\n  return lps\n}\n"

export const KMP_TS_HASH = "6aa9ae5c5abb81d208bd955016efa124cb38691abb539d9cefc640a948e1655e"

export function getKMPCatalog(): {
  typescript: CodeDocument
  pseudocode?: CodeDocument
} {
  const typescript: CodeDocument = {
    documentId: "kmp.ts",
    language: 'typescript',
    title: "KMP (TypeScript)",
    source: TS_SOURCE,
    sourceHash: KMP_TS_HASH,
    anchors: [
  {
    "id": "buildLps",
    "label": "构建 LPS",
    "range": {
      "startLine": 5,
      "endLine": 5
    }
  },
  {
    "id": "match",
    "label": "字符匹配",
    "range": {
      "startLine": 9,
      "endLine": 9
    }
  },
  {
    "id": "hit",
    "label": "找到模式",
    "range": {
      "startLine": 13,
      "endLine": 13
    }
  },
  {
    "id": "fallback",
    "label": "失配回退",
    "range": {
      "startLine": 16,
      "endLine": 16
    }
  }
,
  {
    "id": "done",
    "label": "返回命中位置",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  },
  {
    "id": "return",
    "label": "返回",
    "range": {
      "startLine": 22,
      "endLine": 22
    }
  },
  // V25 acceptance: statement-level anchors for frames that were unmapped or pointed at
  // the buildLps call site / the else-if header instead of the executed statement.
  { "id": "emptyPattern", "label": "空模式约定：命中 [0]", "range": { "startLine": 4, "endLine": 4 } },
  { "id": "fallbackWrite", "label": "失配回退 j ← lps[j-1]", "range": { "startLine": 17, "endLine": 17 } },
  { "id": "advance", "label": "j=0 失配，文本前进", "range": { "startLine": 19, "endLine": 19 } },
  { "id": "lpsCompare", "label": "比较 pattern[i] 与 pattern[len]", "range": { "startLine": 29, "endLine": 29 } },
  { "id": "lpsExtend", "label": "len++，lps[i] = len", "range": { "startLine": 30, "endLine": 31 } },
  { "id": "lpsFallbackCond", "label": "len > 0 分支", "range": { "startLine": 33, "endLine": 33 } },
  { "id": "lpsFallback", "label": "len ← lps[len-1]", "range": { "startLine": 34, "endLine": 34 } },
  { "id": "lpsZero", "label": "lps[i] = 0", "range": { "startLine": 36, "endLine": 37 } },
  { "id": "lpsReturn", "label": "返回 lps", "range": { "startLine": 40, "endLine": 40 } },
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function kmpSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
