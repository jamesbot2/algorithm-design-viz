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

export interface CodeDocument {
  documentId: string
  language: 'typescript' | 'pseudocode' | 'cpp' | 'text'
  title: string
  source: string
  /** SHA-256 hex of source (utf-8) when available */
  sourceHash: string
  anchors: CodeAnchor[]
}
