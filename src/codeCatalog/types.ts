/** 1-based inclusive line range in a CodeDocument */
export interface SourceRange {
  startLine: number
  endLine: number
  startCol?: number
  endCol?: number
}

export interface CodeAnchor {
  id: string
  label: string
  range: SourceRange
}

/**
 * V28: the six reference-implementation languages of the code panel (order = switcher order).
 * Pseudocode is a separate teaching view, not a language choice.
 */
export const CODE_LANGUAGES = ['typescript', 'python', 'cpp', 'java', 'rust', 'go'] as const
export type CodeLanguage = (typeof CODE_LANGUAGES)[number]

export interface CodeDocument {
  documentId: string
  language: CodeLanguage | 'pseudocode' | 'text'
  title: string
  source: string
  /** SHA-256 hex of source (utf-8) when available */
  sourceHash: string
  anchors: CodeAnchor[]
}
