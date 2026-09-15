import { describe, expect, it } from 'vitest'
import { getBINARY_SEARCHCatalog } from '../src/codeCatalog/binarySearch'
import { getLCSCatalog } from '../src/codeCatalog/lcs'
import { resolveExecRange } from '../src/components/codeBrowser/resolveExec'

describe('V5 R1 multi-doc CodeBrowser anchors', () => {
  it('binarySearch init/mid/equal/found resolve DIFFERENT line numbers on TS vs pseudo', () => {
    const cat = getBINARY_SEARCHCatalog()
    expect(cat.pseudocode).toBeTruthy()
    expect(cat.typescript.documentId).not.toBe(cat.pseudocode!.documentId)

    for (const id of ['init', 'mid', 'equal', 'found'] as const) {
      const ts = resolveExecRange(cat.typescript, id)
      const ps = resolveExecRange(cat.pseudocode!, id)
      expect(ts, `ts ${id}`).toBeTruthy()
      expect(ps, `pseudo ${id}`).toBeTruthy()
      expect(ts!.startLine).not.toBe(ps!.startLine)
    }
  })

  it('switching tab uses that document anchors (not TS lines on pseudo)', () => {
    const cat = getBINARY_SEARCHCatalog()
    const activeTs = resolveExecRange(cat.typescript, 'mid')!
    const activePseudo = resolveExecRange(cat.pseudocode!, 'mid')!
    // Simulating tab=pseudo must NOT reuse TS startLine
    expect(activePseudo.startLine).toBe(3)
    expect(activeTs.startLine).toBe(7)
    expect(activePseudo.startLine).not.toBe(activeTs.startLine)
  })

  it('LCS typescript and pseudocode have distinct documentIds', () => {
    const cat = getLCSCatalog()
    expect(cat.pseudocode).toBeTruthy()
    expect(cat.typescript.documentId).toBe('lcs.ts')
    expect(cat.pseudocode!.documentId).toBe('lcs.pseudo')
    expect(cat.typescript.documentId).not.toBe(cat.pseudocode!.documentId)
  })
})
