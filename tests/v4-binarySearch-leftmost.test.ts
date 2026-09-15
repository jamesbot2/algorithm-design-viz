import { createHash } from 'crypto'
import { describe, expect, it } from 'vitest'
import { generateSteps } from '../src/algorithms/binarySearch'
import { getBINARY_SEARCHCatalog, BINARY_SEARCH_TS_HASH } from '../src/codeCatalog/binarySearch'
import { createBinarySearchPreview, createPreviewForAlgo } from '../src/preview/createPreview'

function lastResult(arr: number[], target: number, mode: 'requireSorted' | 'sortThenSearch' = 'requireSorted') {
  const steps = generateSteps(arr, target, mode)
  return steps[steps.length - 1]!.result as { foundIndex: number | null }
}

describe('V4 binarySearch leftmost + catalog truth', () => {
  it('[1,1,1,2] target 1 → leftmost index 0', () => {
    expect(lastResult([1, 1, 1, 2], 1).foundIndex).toBe(0)
  })

  it('equal / less / greater / found / miss branches', () => {
    const hit = generateSteps([1, 2, 3, 5, 7], 5, 'requireSorted')
    expect(hit.some((s) => s.codeRefs?.some((r) => r.anchorId === 'equal'))).toBe(true)
    expect(hit[hit.length - 1]!.result).toMatchObject({ foundIndex: 3 })

    const lessPath = generateSteps([1, 3, 5, 7, 9], 9, 'requireSorted')
    expect(lessPath.some((s) => s.codeRefs?.some((r) => r.anchorId === 'less'))).toBe(true)
    expect(lessPath.some((s) => s.codeRefs?.some((r) => r.anchorId === 'greater'))).toBe(false)

    const greaterPath = generateSteps([1, 3, 5, 7, 9], 1, 'requireSorted')
    expect(greaterPath.some((s) => s.codeRefs?.some((r) => r.anchorId === 'greater'))).toBe(true)
    // greater branch must not highlight less anchor
    const greaterSteps = greaterPath.filter((s) => s.codeRefs?.some((r) => r.anchorId === 'greater'))
    expect(greaterSteps.every((s) => !s.codeRefs?.some((r) => r.anchorId === 'less'))).toBe(true)

    const miss = generateSteps([1, 3, 5, 7, 9], 4, 'requireSorted')
    expect(miss[miss.length - 1]!.result).toMatchObject({ foundIndex: null })
    expect(miss.some((s) => s.codeRefs?.some((r) => r.anchorId === 'miss'))).toBe(true)
  })

  it('sortThenSearch mode still leftmost on duplicates', () => {
    const r = lastResult([2, 1, 1, 1], 1, 'sortThenSearch')
    expect(r.foundIndex).toBe(0) // in sorted array [1,1,1,2]
  })

  it('catalog source is leftmost (no early return on equal)', () => {
    const cat = getBINARY_SEARCHCatalog()
    expect(cat.typescript.source).toMatch(/candidate/)
    expect(cat.typescript.source).toMatch(/hi = mid - 1/)
    expect(cat.typescript.source).not.toMatch(/=== target\) return mid/)
    expect(cat.typescript.sourceHash).toBe(BINARY_SEARCH_TS_HASH)
    expect(createHash('sha256').update(cat.typescript.source, 'utf8').digest('hex')).toBe(
      BINARY_SEARCH_TS_HASH,
    )
    expect(cat.typescript.documentId).toBe('binarySearch.ts')
    expect(cat.pseudocode?.documentId).toBe('binarySearch.pseudo')
    const ids = new Set(cat.typescript.anchors.map((a) => a.id))
    for (const id of ['init', 'mid', 'equal', 'less', 'greater', 'found', 'miss']) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('createPreview is pure and does not invent mid', () => {
    const step = createBinarySearchPreview({ arr: [1, 2, 3, 5, 7], target: 5 })
    expect(step.vars?.mid).toBeNull()
    expect(step.vars?.lo).toBe(0)
    expect(step.vars?.hi).toBe(4)
    expect(step.phase).toBe('preview')
    const via = createPreviewForAlgo('binarySearch', {
      arrayText: '1, 2, 3',
      target: '2',
    })
    expect(via.vars?.mid).toBeNull()
  })
})
