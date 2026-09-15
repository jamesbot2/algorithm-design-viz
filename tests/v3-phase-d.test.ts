import { createHash } from 'crypto'
import { describe, expect, it } from 'vitest'
import { getCatalog, CATALOG_ALGO_IDS } from '../src/codeCatalog'
import { getDijkstraCatalog, DIJKSTRA_TS_HASH } from '../src/codeCatalog/dijkstra'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import { generateSteps as lcs } from '../src/algorithms/lcs'
import { solveNQueens } from '../src/algorithms/nQueens'
import { generateSteps as dijkstra } from '../src/algorithms/dijkstra'
import { generateSteps as binarySearch } from '../src/algorithms/binarySearch'
import { generateSteps as kadane } from '../src/algorithms/kadane'
import { generateSteps as bfs } from '../src/algorithms/bfs'
import { generateSteps as floyd } from '../src/algorithms/floyd'
import { generateSteps as editDistance } from '../src/algorithms/editDistance'
import { generateSteps as kmp } from '../src/algorithms/kmp'
import { generateSteps as insertion } from '../src/algorithms/insertionSort'
import { generateSteps as merge } from '../src/algorithms/mergeSort'
import { generateSteps as quick } from '../src/algorithms/quickSort'
import { generateSteps as maxSubDC } from '../src/algorithms/maxSubarrayDC'
import { generateSteps as dijkstraHeap } from '../src/algorithms/dijkstraHeap'
import { generateSteps as kruskal } from '../src/algorithms/kruskal'
import { generateSteps as prim } from '../src/algorithms/prim'
import { generateSteps as bellmanFord } from '../src/algorithms/bellmanFord'
import { generateSteps as matrixChain } from '../src/algorithms/matrixChain'
import { generateSteps as huffman } from '../src/algorithms/huffman'
import { generateSteps as activitySelection } from '../src/algorithms/activitySelection'
import { generateSteps as knapsack01 } from '../src/algorithms/knapsack01'
import {
  solveDp2d,
  solveDp1dCorrect,
  solveDp1dWrongForward,
  bruteForceKnapsack,
  solveBacktracking,
  solveBranchAndBound,
  greedyByDensity,
  DEFAULT_INSTANCE,
} from '../src/algorithms/knapsack'
import type { Step } from '../src/types/step'

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function assertCatalog(algoId: string) {
  const cat = getCatalog(algoId)
  expect(cat, `catalog missing for ${algoId}`).toBeTruthy()
  const doc = cat!.typescript
  expect(doc.source.length).toBeGreaterThan(40)
  expect(doc.source).not.toMatch(/\.\.\.|TODO|FIXME|stub/i)
  expect(doc.sourceHash).toBe(sha256(doc.source))
  const lines = doc.source.split('\n')
  expect(doc.anchors.length).toBeGreaterThanOrEqual(3)
  for (const a of doc.anchors) {
    expect(a.range.startLine).toBeGreaterThanOrEqual(1)
    expect(a.range.endLine).toBeLessThanOrEqual(lines.length)
    expect(a.range.startLine).toBeLessThanOrEqual(a.range.endLine)
  }
  return cat!
}

function assertCodeRefsResolve(steps: Step[], algoId: string) {
  const cat = assertCatalog(algoId)
  const anchorIds = new Set(cat.typescript.anchors.map((a) => a.id))
  const withRefs = steps.filter((s) => (s.codeRefs?.length ?? 0) > 0)
  expect(withRefs.length).toBeGreaterThan(0)
  for (const s of withRefs) {
    for (const r of s.codeRefs!) {
      expect(r.documentId).toBe(cat.typescript.documentId)
      expect(anchorIds.has(r.anchorId), `missing anchor ${r.anchorId} for ${algoId}`).toBe(true)
    }
  }
}

describe('V3 Phase D catalogs', () => {
  it('getCatalog(dijkstra) matches prior vertical sample', () => {
    const via = getCatalog('dijkstra')!
    const direct = getDijkstraCatalog()
    expect(via.typescript.sourceHash).toBe(DIJKSTRA_TS_HASH)
    expect(via.typescript.documentId).toBe(direct.typescript.documentId)
  })

  it('every registered catalog id has valid hash + anchors', () => {
    for (const id of CATALOG_ALGO_IDS) {
      assertCatalog(id)
    }
  })

  it('LCS fill + reconstruct emit mapped codeRefs', () => {
    const steps = lcs([], 'AB', 'AC')
    assertCodeRefsResolve(steps, 'lcs')
    const anchors = new Set(steps.flatMap((s) => s.codeRefs?.map((r) => r.anchorId) ?? []))
    expect(anchors.has('compareChars') || anchors.has('takeDiagonal') || anchors.has('dpFill')).toBe(true)
    expect(anchors.has('reconstruct') || anchors.has('reconstructMove')).toBe(true)
    expect(steps.some((s) => s.phase === 'reconstruct')).toBe(true)
  })

  it('N-Queens: frameId + first tree immutable + codeRefs', () => {
    const { steps } = solveNQueens(4, 'one')
    assertCodeRefsResolve(steps, 'nQueens')
    expect(steps[0]!.frameId).toBeTruthy()
    expect(steps[0]!.searchTree).toBeTruthy()
    const early = steps[0]!.searchTree!
    const earlyKids = early.children?.length ?? 0
    const late = steps[steps.length - 1]!.searchTree!
    expect(early).not.toBe(late)
    late.children?.push({ id: 'x', label: 'x', status: 'exploring' })
    expect(steps[0]!.searchTree!.children?.length ?? 0).toBe(earlyKids)
  })

  it('Knapsack strategy switch changes documentId', () => {
    const a = getCatalog('knapsack.dp2d')!.typescript.documentId
    const b = getCatalog('knapsack.dp1dWrong')!.typescript.documentId
    const c = getCatalog('knapsack.greedy')!.typescript.documentId
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect(b).toContain('dp1dWrong')
  })

  it('Knapsack strategies emit resolving codeRefs', () => {
    assertCodeRefsResolve(solveDp2d(DEFAULT_INSTANCE).steps, 'knapsack.dp2d')
    assertCodeRefsResolve(solveDp1dCorrect(DEFAULT_INSTANCE).steps, 'knapsack.dp1dCorrect')
    assertCodeRefsResolve(solveDp1dWrongForward(DEFAULT_INSTANCE).steps, 'knapsack.dp1dWrong')
    assertCodeRefsResolve(bruteForceKnapsack(DEFAULT_INSTANCE).steps!, 'knapsack.brute')
    assertCodeRefsResolve(solveBacktracking(DEFAULT_INSTANCE).steps, 'knapsack.backtracking')
    assertCodeRefsResolve(solveBranchAndBound(DEFAULT_INSTANCE).steps, 'knapsack.branchAndBound')
    assertCodeRefsResolve(greedyByDensity(DEFAULT_INSTANCE).steps, 'knapsack.greedy')
  })

  it('migrated algos emit codeRefs that resolve', () => {
    assertCodeRefsResolve(bubble([3, 1, 2]), 'bubbleSort')
    assertCodeRefsResolve(insertion([4, 2, 1]), 'insertionSort')
    assertCodeRefsResolve(merge([4, 2, 1]), 'mergeSort')
    assertCodeRefsResolve(quick([4, 2, 1]), 'quickSort')
    assertCodeRefsResolve(binarySearch([1, 2, 3, 5, 7], 5, 'requireSorted'), 'binarySearch')
    assertCodeRefsResolve(kadane([-2, 1, -3, 4]), 'kadane')
    assertCodeRefsResolve(maxSubDC([-2, 1, -3, 4]), 'maxSubarrayDC')
    assertCodeRefsResolve(editDistance([], 'ab', 'ac'), 'editDistance')
    assertCodeRefsResolve(kmp([], 'ABABC', 'AB'), 'kmp')
    assertCodeRefsResolve(bfs([]), 'bfs')
    assertCodeRefsResolve(dijkstra([], undefined, 6, 0), 'dijkstra')
    assertCodeRefsResolve(dijkstraHeap([], undefined, 6, 0), 'dijkstraHeap')
    assertCodeRefsResolve(kruskal([]), 'kruskal')
    assertCodeRefsResolve(prim([]), 'prim')
    assertCodeRefsResolve(bellmanFord([]), 'bellmanFord')
    assertCodeRefsResolve(floyd([]), 'floyd')
    assertCodeRefsResolve(matrixChain([]), 'matrixChain')
    assertCodeRefsResolve(huffman([]), 'huffman')
    assertCodeRefsResolve(activitySelection([]), 'activitySelection')
    assertCodeRefsResolve(knapsack01([]), 'knapsack01')
  })
})
