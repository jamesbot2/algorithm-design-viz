import { describe, expect, it } from 'vitest'
import { generateSteps as insertionSteps } from '../src/algorithms/insertionSort'
import { generateSteps as mergeSteps } from '../src/algorithms/mergeSort'
import { getINSERTION_SORTCatalog } from '../src/codeCatalog/insertionSort'
import { getMERGE_SORTCatalog } from '../src/codeCatalog/mergeSort'

function lineText(source: string, startLine: number) {
  return source.split('\n')[startLine - 1] ?? ''
}

describe('V12-02 code anchors match ops (assert source text)', () => {
  it('insertion take-key ≠ insert write-back', () => {
    const cat = getINSERTION_SORTCatalog().typescript
    const steps = insertionSteps([5, 4, 3, 2, 1])
    const take = steps.find((s) => String(s.message).includes('取出'))!
    const write = steps.find((s) => s.phase === 'insert' && String(s.message).includes('插入 key'))!
    expect(take.codeRefs?.[0]?.anchorId).toBe('outer')
    expect(write.codeRefs?.[0]?.anchorId).toBe('insert')
    const takeLine = lineText(cat.source, cat.anchors.find((a) => a.id === 'outer')!.range.startLine)
    const writeLine = lineText(cat.source, cat.anchors.find((a) => a.id === 'insert')!.range.startLine)
    expect(takeLine).toMatch(/key\s*=/)
    expect(takeLine).not.toMatch(/arr\[j\s*\+\s*1\]\s*=\s*key/)
    expect(writeLine).toMatch(/arr\[j\s*\+\s*1\]\s*=\s*key/)
  })

  it('merge left-copy / left-write do not land on else right branch', () => {
    const cat = getMERGE_SORTCatalog().typescript
    const steps = mergeSteps([4, 1, 3, 2])
    const leftCopy = steps.find((s) => s.codeRefs?.[0]?.anchorId === 'mergeCopyLeft')
    const leftWrite = steps.find((s) => s.codeRefs?.[0]?.anchorId === 'mergeWriteLeft')
    expect(leftCopy || leftWrite).toBeTruthy()
    for (const s of [leftCopy, leftWrite].filter(Boolean)) {
      const aid = s!.codeRefs![0]!.anchorId
      const text = lineText(cat.source, cat.anchors.find((a) => a.id === aid)!.range.startLine)
      expect(text).not.toMatch(/^\s*else\b/)
    }
    const right = cat.anchors.find((a) => a.id === 'mergeWriteRight')!
    expect(lineText(cat.source, right.range.startLine)).toMatch(/else/)
  })
})
