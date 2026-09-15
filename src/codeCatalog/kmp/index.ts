import type { CodeDocument } from '../types'
import { fnv1aHex } from '../hash'

const TS_SOURCE = "/** KMP string matching — complete TypeScript reference. */\nexport function kmpSearch(text: string, pattern: string): number[] {\n  const hits: number[] = []\n  if (!pattern) return hits\n  const lps = buildLps(pattern)\n  let i = 0\n  let j = 0\n  while (i < text.length) {\n    if (text[i] === pattern[j]) {\n      i++\n      j++\n      if (j === pattern.length) {\n        hits.push(i - j)\n        j = lps[j - 1]!\n      }\n    } else if (j > 0) {\n      j = lps[j - 1]!\n    } else {\n      i++\n    }\n  }\n  return hits\n}\nfunction buildLps(pattern: string): number[] {\n  const lps = Array(pattern.length).fill(0)\n  let len = 0\n  let i = 1\n  while (i < pattern.length) {\n    if (pattern[i] === pattern[len]) {\n      len++\n      lps[i] = len\n      i++\n    } else if (len > 0) {\n      len = lps[len - 1]!\n    } else {\n      lps[i] = 0\n      i++\n    }\n  }\n  return lps\n}\n"

export const KMP_TS_HASH = "dbd9365c7585aea5839f189725d93ab567848ebd6ab763af1c1186a773eacfc7"

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
  }
],
  }
  const pseudocode: CodeDocument | undefined = undefined
  return pseudocode ? { typescript, pseudocode } : { typescript }
}

export function kmpSourceHashShort(): string {
  return fnv1aHex(TS_SOURCE)
}
