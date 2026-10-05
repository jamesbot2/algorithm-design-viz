/**
 * V28 multi-language code catalog.
 *
 * Architecture (step semantics ⟂ documents):
 *   - A trace step carries SEMANTIC anchor ids (`codeRefs[].anchorId` + role). The renderer
 *     never uses the ref's `documentId` to pick a document or a line; that field is a legacy
 *     namespace tag kept so traces stay byte-identical (see resolve.ts).
 *   - Every language document of an algorithm provides its own `source`, `anchors`,
 *     `sourceHash`, `language`, `title`, `documentId`. The same anchor id names the same
 *     operation in each document, at that document's own lines.
 *   - The code panel resolves the current step's anchor ids against the document of the
 *     active language (`resolveStepInDocument`).
 *
 * Loading: TypeScript (and pseudocode) stay in the main bundle (they existed before V28 and
 * are needed synchronously). Python / C++ / Java / Rust / Go documents of an algorithm are one
 * dynamic-import chunk per algorithm (`<algo>/langs.generated.ts`, built by
 * scripts/gen-code-langs.mjs from real source files), fetched the first time that algorithm
 * shows a non-TypeScript language, then cached for the session.
 */
import { CODE_LANGUAGES, type CodeAnchor, type CodeDocument, type CodeLanguage } from './types'

export { CODE_LANGUAGES, type CodeLanguage }

export const LANGUAGE_LABEL: Readonly<Record<CodeLanguage, string>> = {
  typescript: 'TypeScript',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
}

/** Short label for compact pills (mobile). */
export const LANGUAGE_SHORT: Readonly<Record<CodeLanguage, string>> = {
  typescript: 'TS',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
  rust: 'Rust',
  go: 'Go',
}

export type LazyLanguage = Exclude<CodeLanguage, 'typescript'>

/** Shape written by scripts/gen-code-langs.mjs (labels are taken from the TS anchors). */
export interface GeneratedLangDoc {
  documentId: string
  language: LazyLanguage
  title: string
  sourceFile: string
  source: string
  sourceHash: string
  anchors: { id: string; range: { startLine: number; endLine: number } }[]
}

type Loader = () => Promise<{ default: GeneratedLangDoc[] }>

/**
 * Every `<dir>/langs.generated.ts` (one lazy chunk each). `dir` is the catalog directory:
 * an algorithm id (`lcs`) or a nested strategy (`knapsack/dp2d`).
 */
const CHUNKS = import.meta.glob<{ default: GeneratedLangDoc[] }>('./**/langs.generated.ts')

/** Catalog ids whose directory name differs from the id (aliases share one chunk). */
const DIR_ALIAS: Readonly<Record<string, string>> = {
  knapsack01: 'knapsack/dp2d',
  'knapsack.dp2d': 'knapsack/dp2d',
  'knapsack.dp1dCorrect': 'knapsack/dp1dCorrect',
  'knapsack.dp1dWrong': 'knapsack/dp1dWrong',
  'knapsack.brute': 'knapsack/brute',
  'knapsack.bruteForce': 'knapsack/brute',
  'knapsack.backtracking': 'knapsack/backtracking',
  'knapsack.branchAndBound': 'knapsack/branchAndBound',
  'knapsack.greedy': 'knapsack/greedy',
}

/** Catalog directory of an algorithm id (or null when it has no multi-language documents). */
export function languageDirOf(algoId: string | null | undefined): string | null {
  if (!algoId) return null
  const dir = DIR_ALIAS[algoId] ?? algoId
  return CHUNKS[`./${dir}/langs.generated.ts`] ? dir : null
}

function loaderOf(algoId: string): Loader | null {
  const dir = languageDirOf(algoId)
  return dir ? (CHUNKS[`./${dir}/langs.generated.ts`] as Loader) : null
}

/** Catalog directories that ship the five non-TS documents. */
export function multiLanguageDirs(): string[] {
  return Object.keys(CHUNKS)
    .map((k) => k.replace(/^\.\//, '').replace(/\/langs\.generated\.ts$/, ''))
    .sort()
}

/** @deprecated name kept for callers/tests: same as multiLanguageDirs(). */
export const multiLanguageAlgoIds = multiLanguageDirs

/** Languages the code panel can show for this catalog id (TypeScript always first). */
export function availableLanguages(algoId: string | null | undefined): CodeLanguage[] {
  return languageDirOf(algoId) ? [...CODE_LANGUAGES] : ['typescript']
}

const cache = new Map<string, Map<LazyLanguage, CodeDocument>>()
const inflight = new Map<string, Promise<Map<LazyLanguage, CodeDocument>>>()
const failedChunk = new Map<string, string>()

function withLabels(doc: GeneratedLangDoc, tsAnchors: readonly CodeAnchor[]): CodeDocument {
  const label = (id: string) => tsAnchors.find((a) => a.id === id)?.label ?? id
  return {
    documentId: doc.documentId,
    language: doc.language,
    title: doc.title,
    source: doc.source,
    sourceHash: doc.sourceHash,
    anchors: doc.anchors.map((a) => ({ id: a.id, label: label(a.id), range: { ...a.range } })),
  }
}

/** Load (once) all lazy documents of an algorithm. Rejects when the chunk fails to load. */
export function loadAlgoLanguages(
  algoId: string,
  tsAnchors: readonly CodeAnchor[] = [],
): Promise<Map<LazyLanguage, CodeDocument>> {
  const hit = cache.get(algoId)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(algoId)
  if (pending) return pending
  const loader = loaderOf(algoId)
  if (!loader) return Promise.resolve(new Map())
  // Browsers cache a failed dynamic import per URL (a plain retry would fail again without a
  // request), so a retry after a fetch failure re-imports the same chunk with a cache-busting query.
  const failedUrl = failedChunk.get(algoId)
  const attempt: Promise<{ default: GeneratedLangDoc[] }> = failedUrl
    ? import(/* @vite-ignore */ `${failedUrl}${failedUrl.includes('?') ? '&' : '?'}retry=${Date.now()}`)
    : loader()
  const p = attempt
    .then((mod) => {
      const map = new Map<LazyLanguage, CodeDocument>()
      for (const d of mod.default) map.set(d.language, withLabels(d, tsAnchors))
      cache.set(algoId, map)
      inflight.delete(algoId)
      return map
    })
    .catch((err) => {
      inflight.delete(algoId)
      const url = String(err instanceof Error ? err.message : err).match(/(https?:\/\/\S+?\.(?:js|ts))(?:\?\S*)?\s*$/)?.[1]
      if (url) failedChunk.set(algoId, url)
      throw err
    })
  inflight.set(algoId, p)
  return p
}

/** Synchronous cache peek (null until loadAlgoLanguages resolved for this algorithm). */
export function peekLanguageDoc(algoId: string | null | undefined, lang: CodeLanguage): CodeDocument | null {
  if (!algoId || lang === 'typescript') return null
  return cache.get(algoId)?.get(lang) ?? null
}

/** Test hook: forget loaded chunks (simulates a first visit). */
export function __resetLanguageCacheForTests() {
  failedChunk.clear()
  cache.clear()
  inflight.clear()
}
