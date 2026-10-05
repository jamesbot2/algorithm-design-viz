/**
 * V28 Phase 3: language-neutral semantic gap detector for every multi-language algorithm.
 *
 * For each algorithm, every semantic anchor id gets a STATEMENT SIGNATURE — a regex over the
 * whitespace-free text of the anchor's line range that states what the statement does (e.g.
 * Kruskal `union` must assign a root's parent, `skip` must be the `a == b → continue` test).
 * The same signature is applied to TypeScript (validating the signature itself) and to every
 * other language, so a marker on the wrong statement fails. In addition:
 *   - block depth: the number of enclosing blocks between the statement and its function must
 *     equal TypeScript's (catches a marker in the wrong branch/loop level),
 *   - no collapse: anchors on different TypeScript lines stay on different lines,
 *   - every frame of the traces resolves (same entry as the code panel) to a statement that
 *     matches the signature of the frame's primary anchor, and every weak/context anchor exists.
 * LCS / KMP / Floyd keep their stricter per-event detector (multiLangSemantics.ts).
 */
import type { CodeDocument } from '../../src/codeCatalog/types'
import type { Step } from '../../src/types/step'
import { resolveStepInDocument, semanticRefs, anchorRange } from '../../src/codeCatalog/resolve'
import { pickPrimaryCodeRef } from '../../src/utils/codeRefs'

export type Lang = 'typescript' | 'python' | 'cpp' | 'java' | 'rust' | 'go' | 'pseudocode'
export type Sig = RegExp | ({ any?: RegExp } & Partial<Record<Lang, RegExp>>)

export interface AlgoSig {
  /** anchor id → signature (all TS anchor ids must be listed) */
  anchors: Record<string, Sig>
  /** anchor ids whose block depth may legitimately differ between languages */
  depthExempt?: string[]
  /** anchor-id pairs allowed to share a line in some language although distinct in TS */
  mayShare?: [string, string][]
}

export const langOf = (d: CodeDocument) => d.language as Lang

/** whitespace-free text; TypeScript non-null assertions (`x!`, `a[i]!`) removed */
export function norm(lang: Lang, s: string): string {
  const w = s.replace(/\s+/g, '')
  return lang === 'typescript' ? w.replace(/(?<=[\w\])])!(?=[^=]|===|$)/g, '') : w
}

/** Signature for a language; pseudocode (pre-existing, coarse) is only checked when spelled out. */
export function sigFor(sig: Sig, lang: Lang): RegExp | null {
  if (lang === 'pseudocode') return sig instanceof RegExp ? null : (sig.pseudocode ?? null)
  if (sig instanceof RegExp) return sig
  return sig[lang] ?? sig.any ?? null
}

const indent = (s: string) => (s.match(/^[ \t]*/)?.[0] ?? '').replace(/\t/g, '    ').length

const FN: Record<Lang, RegExp> = {
  typescript: /^\s*(export\s+)?(async\s+)?function\b|=>\s*\{\s*$|^\s*(const|let)\s+\w+\s*=\s*(\([^)]*\)|\w+)\s*(:[^=]*)?=>/,
  python: /^\s*def\s/,
  cpp: /^\s*(?!(?:if|for|while|switch|else|return|do)\b)[\w:<>,*&\s]+?[\s*&]\**&?(?!(?:if|for|while|switch)\b)\w+\s*\([^;]*\)\s*(const\s*)?\{\s*$|\]\s*\([^)]*\)\s*(mutable\s*)?(->\s*[\w:<>\s]+?)?\{\s*$/,
  java: /^\s*(?:(?:public|private|protected|static|final)\s+)+[\w<>[\],.\s]+\s+\w+\s*\([^;]*\)\s*(throws\s[\w,\s]+)?\{\s*$/,
  rust: /^\s*(pub(\([^)]*\))?\s+)?fn\s/,
  go: /^\s*func\b|:?=\s*func\s*\(/,
  pseudocode: /^(?!\s)/,
}

/** number of enclosing blocks between line `line1` and its function header */
export function relDepth(doc: CodeDocument, line1: number): number {
  const lines = doc.source.split('\n')
  const fn = FN[langOf(doc)]
  if (fn.test(lines[line1 - 1] ?? '')) return 0
  let cur = indent(lines[line1 - 1] ?? '')
  let depth = 0
  for (let k = line1 - 2; k >= 0; k--) {
    const l = lines[k]!
    if (!l.trim()) continue
    const d = indent(l)
    if (d >= cur) continue
    cur = d
    if (fn.test(l)) return depth
    // `): T {` closes a multi-line parameter list: the function header itself
    if (/^\s*\).*\{\s*$/.test(l)) return depth
    depth++
  }
  return depth
}

export function rangeText(doc: CodeDocument, r: { startLine: number; endLine: number }): string {
  return norm(langOf(doc), doc.source.split('\n').slice(r.startLine - 1, r.endLine).join('\n'))
}

/** Static checks of one document against the TypeScript document and the signatures. */
export function docFailures(ts: CodeDocument, doc: CodeDocument, sig: AlgoSig): string[] {
  const f: string[] = []
  const lang = langOf(doc)
  const id = doc.documentId
  for (const a of ts.anchors) {
    const s = sig.anchors[a.id]
    if (!s) {
      f.push(`signature table lacks anchor "${a.id}"`)
      continue
    }
    const r = anchorRange(doc, a.id)
    if (!r) {
      if (lang !== 'pseudocode') f.push(`${id}: anchor "${a.id}" missing or out of range`)
      continue
    }
    const re = sigFor(s, lang)
    const text = rangeText(doc, r)
    if (re && !re.test(text)) f.push(`${id}:${r.startLine}-${r.endLine} "${a.id}" does not match ${re} — got "${text}"`)
    if (lang !== 'pseudocode' && !sig.depthExempt?.includes(a.id)) {
      const want = relDepth(ts, a.range.startLine)
      const got = relDepth(doc, r.startLine)
      if (want !== got) f.push(`${id}:${r.startLine} "${a.id}" block depth ${got} ≠ TypeScript ${want}`)
    }
  }
  if (lang !== 'pseudocode') {
    const tsLine = new Map(ts.anchors.map((a) => [a.id, a.range.startLine]))
    const docLine = new Map(doc.anchors.map((a) => [a.id, a.range.startLine]))
    const ids = [...tsLine.keys()]
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const x = ids[i]!
        const y = ids[j]!
        if (tsLine.get(x) === tsLine.get(y)) continue
        if (sig.mayShare?.some(([p, q]) => (p === x && q === y) || (p === y && q === x))) continue
        if (docLine.get(x) != null && docLine.get(x) === docLine.get(y)) f.push(`${id}: "${x}" and "${y}" collapse onto line ${docLine.get(x)}`)
      }
  }
  return f
}

/** Per-frame check through the code panel's resolution entry. */
export function frameFailures(doc: CodeDocument, step: Step, sig: AlgoSig): string[] {
  const f: string[] = []
  const lang = langOf(doc)
  const primary = pickPrimaryCodeRef(step)?.anchorId
  if (!primary) return [`frame has no primary anchor ("${step.message}")`]
  const r = resolveStepInDocument(doc, semanticRefs(step.codeRefs))
  if (!r.exec) {
    if (lang === 'pseudocode') return []
    return [`${doc.documentId}: no execution line for "${primary}"`]
  }
  const s = sig.anchors[primary]
  const re = s ? sigFor(s, lang) : null
  if (!s) f.push(`no signature for "${primary}"`)
  const text = rangeText(doc, r.exec)
  if (re && !re.test(text)) f.push(`${doc.documentId}:${r.exec.startLine} "${primary}" does not match ${re} — got "${text}"`)
  for (const ref of step.codeRefs ?? []) {
    if (ref.anchorId === primary) continue
    if (lang !== 'pseudocode' && !anchorRange(doc, ref.anchorId)) f.push(`${doc.documentId}: weak anchor "${ref.anchorId}" missing`)
  }
  return f
}
