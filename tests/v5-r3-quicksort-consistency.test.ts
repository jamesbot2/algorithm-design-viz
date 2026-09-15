import { createHash } from 'crypto'
import { describe, expect, it } from 'vitest'
import { generateSteps, meta as qsMeta } from '../src/algorithms/quickSort'
import { getQUICK_SORTCatalog, QUICK_SORT_TS_HASH } from '../src/codeCatalog/quickSort'
import { getBINARY_SEARCHCatalog } from '../src/codeCatalog/binarySearch'
import { getLCSCatalog } from '../src/codeCatalog/lcs'
import { generateSteps as bsSteps } from '../src/algorithms/binarySearch'
import { generateSteps as lcsSteps } from '../src/algorithms/lcs'

describe('V5 R3 quickSort single source of truth', () => {
  it('[2,1] first compare vars match catalog i meaning (i = L-1 style)', () => {
    const steps = generateSteps([2, 1])
    const firstCompare = steps.find((s) => s.phase === 'compare' || s.codeRefs?.some((r) => r.anchorId === 'compare'))
    expect(firstCompare).toBeTruthy()
    // i starts at L-1 = -1 conceptually; first compare before any swap keeps i at -1 or omitted
    const i = firstCompare!.vars?.i
    expect(i === -1 || i === undefined || (typeof i === 'number' && i < 0)).toBe(true)

    const cat = getQUICK_SORTCatalog()
    expect(cat.typescript.source).toMatch(/let i = (lo|L) - 1/)
    expect(cat.typescript.source).not.toMatch(/let i = lo\n/)
  })

  it('done is not mapped to partition; pivot place ≠ loop swap anchor', () => {
    const stepsDone = generateSteps([2, 1])
    const done = stepsDone.find((s) => s.phase === 'done')
    expect(done).toBeTruthy()
    const doneAnchor = done!.codeRefs?.[0]?.anchorId
    expect(doneAnchor).not.toBe('partition')
    expect(doneAnchor).toMatch(/done|return/)

    const pivotPlace = stepsDone.find((s) => s.codeRefs?.some((r) => r.anchorId === 'pivotPlace'))
    expect(pivotPlace).toBeTruthy()

    // [1,2] triggers a loop-body swap (1 <= pivot 2)
    const stepsSwap = generateSteps([1, 2])
    const loopSwap = stepsSwap.find((s) => s.codeRefs?.some((r) => r.anchorId === 'loopSwap'))
    expect(loopSwap).toBeTruthy()
    expect(loopSwap!.codeRefs!.some((r) => r.anchorId === 'pivotPlace')).toBe(false)
    expect(pivotPlace!.codeRefs!.some((r) => r.anchorId === 'loopSwap')).toBe(false)
  })

  it('catalog hash matches source; space notes mention stack not O(1)', () => {
    const cat = getQUICK_SORTCatalog()
    expect(createHash('sha256').update(cat.typescript.source, 'utf8').digest('hex')).toBe(QUICK_SORT_TS_HASH)
    expect(cat.typescript.sourceHash).toBe(QUICK_SORT_TS_HASH)
    expect(qsMeta.spaceComplexity).toMatch(/log|栈|stack/i)
    expect(qsMeta.spaceComplexity).toMatch(/递归栈|log n/i)
    expect(qsMeta.spaceNotes ?? qsMeta.spaceComplexity).toMatch(/不可标为整体 O\(1\)|非整体 O\(1\)/)
  })

  it('recursion steps carry frameId', () => {
    const steps = generateSteps([3, 1, 4, 2])
    const withFrame = steps.filter((s) => s.frameId)
    expect(withFrame.length).toBeGreaterThan(0)
  })
})

describe('V5 M1 consistency registry (binarySearch / LCS / quickSort)', () => {
  it('every emitted anchorId exists in catalog typescript', () => {
    const cases: { id: string; steps: ReturnType<typeof generateSteps>; anchors: Set<string> }[] = [
      {
        id: 'quickSort',
        steps: generateSteps([2, 1, 3]),
        anchors: new Set(getQUICK_SORTCatalog().typescript.anchors.map((a) => a.id)),
      },
      {
        id: 'binarySearch',
        steps: bsSteps([1, 2, 3, 5, 7], 5),
        anchors: new Set(getBINARY_SEARCHCatalog().typescript.anchors.map((a) => a.id)),
      },
      {
        id: 'lcs',
        steps: lcsSteps([], 'AB', 'AC'),
        anchors: new Set(getLCSCatalog().typescript.anchors.map((a) => a.id)),
      },
    ]
    for (const c of cases) {
      for (const s of c.steps) {
        for (const ref of s.codeRefs ?? []) {
          expect(c.anchors.has(ref.anchorId), `${c.id} missing anchor ${ref.anchorId}`).toBe(true)
        }
      }
    }
  })
})
