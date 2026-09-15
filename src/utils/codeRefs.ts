import type { Step } from '../types/step'

export type CodeRefRole = 'primary' | 'context' | 'condition'

export interface CodeRef {
  documentId: string
  anchorId: string
  role?: CodeRefRole
}

/** Prefer explicit primary; else first ref without context/condition role; else first. */
export function pickPrimaryCodeRef(step: Step | undefined | null): CodeRef | undefined {
  const refs = step?.codeRefs
  if (!refs?.length) return undefined
  const primary = refs.find((r) => r.role === 'primary')
  if (primary) return primary
  const nonWeak = refs.find((r) => r.role !== 'context' && r.role !== 'condition')
  return nonWeak ?? refs[0]
}

export function weakContextRefs(step: Step | undefined | null): CodeRef[] {
  const refs = step?.codeRefs
  if (!refs?.length) return []
  return refs.filter((r) => r.role === 'context' || r.role === 'condition')
}

export function isMappedTeachingEvent(step: Step | undefined | null): boolean {
  return Boolean(pickPrimaryCodeRef(step)?.anchorId)
}
