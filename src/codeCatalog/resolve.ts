/**
 * V28: resolve a step's SEMANTIC code refs against whichever document is shown.
 *
 * Steps emit `codeRefs: { documentId, anchorId, role }[]`. Only `anchorId` + `role` are
 * semantic. `documentId` is a legacy namespace tag (historically the TS document id) that is
 * deliberately ignored here, so the same step resolves in TypeScript, Python, C++, Java, Rust,
 * Go or pseudocode — each at that document's own lines. No per-language line numbers live in
 * any algorithm generator.
 */
import type { CodeDocument, SourceRange } from './types'

export type SemanticRole = 'primary' | 'context' | 'condition'

export interface SemanticRefs {
  /** anchor id that drives the execution arrow */
  primary?: string
  /** anchor ids that get the weak (condition/context) highlight */
  weak: string[]
}

type RefLike = { anchorId: string; role?: SemanticRole; documentId?: string }

/** Strip refs to their semantics (primary: explicit primary → first non-weak → first). */
export function semanticRefs(refs: readonly RefLike[] | undefined | null): SemanticRefs {
  if (!refs?.length) return { weak: [] }
  const isWeak = (r: RefLike) => r.role === 'context' || r.role === 'condition'
  const primary = refs.find((r) => r.role === 'primary') ?? refs.find((r) => !isWeak(r)) ?? refs[0]
  return { primary: primary?.anchorId, weak: refs.filter(isWeak).map((r) => r.anchorId) }
}

export function anchorRange(doc: CodeDocument | null | undefined, anchorId: string | null | undefined): SourceRange | null {
  if (!doc || !anchorId) return null
  const a = doc.anchors.find((x) => x.id === anchorId)
  if (!a) return null
  const lines = doc.source.split('\n').length
  const { startLine, endLine } = a.range
  // An out-of-range anchor is a broken document, not a location.
  if (!(startLine >= 1 && endLine >= startLine && endLine <= lines)) return null
  return a.range
}

export interface ResolvedExec {
  documentId: string
  /** primary range (exec arrow on startLine; startLine+1..endLine weak) or null = no location */
  exec: SourceRange | null
  /** 1-based weak-highlight lines (condition/context anchors + rest of the primary range) */
  weakLines: number[]
}

export function resolveStepInDocument(doc: CodeDocument, refs: SemanticRefs): ResolvedExec {
  const exec = anchorRange(doc, refs.primary)
  const weak = new Set<number>()
  for (const id of refs.weak) {
    const r = anchorRange(doc, id)
    if (r) for (let L = r.startLine; L <= r.endLine; L++) weak.add(L)
  }
  if (exec) for (let L = exec.startLine + 1; L <= exec.endLine; L++) weak.add(L)
  if (exec) weak.delete(exec.startLine)
  return { documentId: doc.documentId, exec, weakLines: [...weak].sort((a, b) => a - b) }
}
