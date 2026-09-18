import { describe, expect, it } from 'vitest'
import { generateSteps } from '../src/algorithms/mergeSort'
import { getMERGE_SORTCatalog } from '../src/codeCatalog/mergeSort'
import { deriveArrayPointers } from '../src/types/step'

function lineText(source: string, startLine: number) {
  return source.split('\n')[startLine - 1] ?? ''
}

describe('V13-02 mergeSort anchors + arrayPointers + snapshot timing', () => {
  const cat = getMERGE_SORTCatalog().typescript

  it('leaf [1] uses return (L>=R), not divide', () => {
    const steps = generateSteps([1])
    const leaf = steps.find((s) => String(s.message).includes('长度 ≤ 1'))!
    expect(leaf).toBeTruthy()
    expect(leaf.codeRefs?.[0]?.anchorId).toBe('return')
    const text = lineText(cat.source, cat.anchors.find((a) => a.id === 'return')!.range.startLine)
    expect(text).toMatch(/L\s*>=\s*R/)
    expect(text).not.toMatch(/mid/)
  })

  it('empty / sorted / reverse / negatives / duplicates produce terminal done', () => {
    for (const input of [[], [1, 2], [2, 1], [4, 1, 3, 2], [3, 3, 1], [-2, 5, -1], [1, 2, 3], [5, 4, 3, 2, 1]]) {
      const steps = generateSteps(input)
      expect(steps.length).toBeGreaterThan(0)
      const last = steps[steps.length - 1]!
      expect(last.codeRefs?.[0]?.anchorId).toBe('done')
      if (input.length) {
        expect([...((last.arrays?.a as number[]) ?? [])].sort((a, b) => a - b)).toEqual(
          [...input].sort((a, b) => a - b),
        )
      }
    }
  })

  it('compare step: i on left, j on right, L/mid/R/k on a — not i/j on main a', () => {
    const steps = generateSteps([4, 1, 3, 2])
    const cmp = steps.find((s) => String(s.message).includes('比较 left['))!
    expect(cmp).toBeTruthy()
    expect(cmp.arrayPointers?.a).toBeTruthy()
    expect(cmp.arrayPointers!.a!.L).toBeDefined()
    expect(cmp.arrayPointers!.a!.mid).toBeDefined()
    expect(cmp.arrayPointers!.a!.R).toBeDefined()
    expect(cmp.arrayPointers!.a!.k).toBeDefined()
    expect(cmp.arrayPointers!.a!.i).toBeUndefined()
    expect(cmp.arrayPointers!.a!.j).toBeUndefined()
    expect(cmp.arrayPointers?.left?.i).toBeDefined()
    expect(cmp.arrayPointers?.right?.j).toBeDefined()
    // deriveArrayPointers must not leak i onto main a
    const onA = deriveArrayPointers(cmp, 'a')
    expect(onA.i).toBeUndefined()
    expect(onA.j).toBeUndefined()
    expect(onA.k).toBeDefined()
    expect(deriveArrayPointers(cmp, 'left').i).toBe(cmp.arrayPointers!.left!.i)
    expect(deriveArrayPointers(cmp, 'right').j).toBe(cmp.arrayPointers!.right!.j)
  })

  it('write snapshot matches a[k]=left[i] (pre-increment); catalog line is assignment not k++', () => {
    const steps = generateSteps([4, 1, 3, 2])
    const write = steps.find((s) => s.codeRefs?.[0]?.anchorId === 'mergeWriteLeft')!
    expect(write).toBeTruthy()
    const i = write.vars!.i as number
    const k = write.vars!.k as number
    const left = write.arrays!.left as number[]
    const a = write.arrays!.a as number[]
    expect(a[k]).toBe(left[i])
    const text = lineText(cat.source, cat.anchors.find((a) => a.id === 'mergeWriteLeft')!.range.startLine)
    expect(text).toMatch(/a\[k\]\s*=\s*left\[i\]/)
    expect(text).not.toMatch(/a\[k\+\+\]/)
  })

  it('mergeWriteRight / copy anchors land on correct source text', () => {
    const right = lineText(cat.source, cat.anchors.find((a) => a.id === 'mergeWriteRight')!.range.startLine)
    expect(right).toMatch(/a\[k\]\s*=\s*right\[j\]/)
    const copyL = lineText(cat.source, cat.anchors.find((a) => a.id === 'mergeCopyLeft')!.range.startLine)
    expect(copyL).toMatch(/a\[k\]\s*=\s*left\[i\]/)
    const copyR = lineText(cat.source, cat.anchors.find((a) => a.id === 'mergeCopyRight')!.range.startLine)
    expect(copyR).toMatch(/a\[k\]\s*=\s*right\[j\]/)
  })

  it('all emitted anchors resolve in catalog', () => {
    const ids = new Set(cat.anchors.map((a) => a.id))
    for (const input of [[1], [1, 2], [2, 1], [4, 1, 3, 2], [3, 3, 1]]) {
      for (const s of generateSteps(input)) {
        for (const r of s.codeRefs ?? []) {
          expect(ids.has(r.anchorId), r.anchorId).toBe(true)
        }
      }
    }
  })
})
