import type { CodeDocument, SourceRange } from '../../codeCatalog/types'

/** Resolve anchor id → SourceRange on the given document (1-based inclusive). */
export function resolveExecRange(
  doc: CodeDocument | undefined | null,
  anchorId: string | undefined | null,
): SourceRange | null {
  if (!doc || !anchorId) return null
  const a = doc.anchors.find((x) => x.id === anchorId)
  return a?.range ?? null
}

/** Active tab document from a catalog bundle. */
export function activeCatalogDoc(
  documents: { typescript: CodeDocument; pseudocode?: CodeDocument },
  tab: 'ts' | 'pseudo',
): CodeDocument {
  if (tab === 'pseudo' && documents.pseudocode) return documents.pseudocode
  return documents.typescript
}
