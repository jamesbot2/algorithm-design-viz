import { describe, expect, it } from 'vitest'
import { generateSteps as mergeSort } from '../src/algorithms/mergeSort'
import { generateSteps as bubbleSort } from '../src/algorithms/bubbleSort'
import { generateSteps as insertionSort } from '../src/algorithms/insertionSort'
import { generateSteps as dijkstra } from '../src/algorithms/dijkstra'
import { generateSteps as dijkstraHeap } from '../src/algorithms/dijkstraHeap'
import { generateSteps as nQueens } from '../src/algorithms/nQueens'
import { generateSteps as editDistance } from '../src/algorithms/editDistance'
import { generateSteps as kmp } from '../src/algorithms/kmp'
import { solveDp2d } from '../src/algorithms/knapsack/dp2d'
import { getMERGE_SORTCatalog } from '../src/codeCatalog/mergeSort'
import { getBUBBLE_SORTCatalog } from '../src/codeCatalog/bubbleSort'
import { getINSERTION_SORTCatalog } from '../src/codeCatalog/insertionSort'
import { getDijkstraCatalog } from '../src/codeCatalog/dijkstra'
import { getDIJKSTRA_HEAPCatalog } from '../src/codeCatalog/dijkstraHeap'
import { getN_QUEENSCatalog } from '../src/codeCatalog/nQueens'
import { getEDIT_DISTANCECatalog } from '../src/codeCatalog/editDistance'
import { getKMPCatalog } from '../src/codeCatalog/kmp'
import { getKNAPSACK_DP2DCatalog } from '../src/codeCatalog/knapsack/dp2d'

type StepLike = { phase?: string; codeRefs?: { anchorId: string }[]; message?: string }

const CASES: {
  id: string
  steps: StepLike[]
  source: string
  anchors: Set<string>
  markers: string[]
}[] = [
  {
    id: 'mergeSort',
    steps: mergeSort([3, 1, 2]),
    source: getMERGE_SORTCatalog().typescript.source,
    anchors: new Set(getMERGE_SORTCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['function mergeSort', 'mid', 'merge(', 'return'],
  },
  {
    id: 'bubbleSort',
    steps: bubbleSort([3, 1, 2]),
    source: getBUBBLE_SORTCatalog().typescript.source,
    anchors: new Set(getBUBBLE_SORTCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['for (let i', 'arr[j]! > arr[j + 1]', 'return arr'],
  },
  {
    id: 'insertionSort',
    steps: insertionSort([3, 1, 2]),
    source: getINSERTION_SORTCatalog().typescript.source,
    anchors: new Set(getINSERTION_SORTCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['for (let i = 1', 'while (j >= 0', 'arr[j + 1] = key', 'return arr'],
  },
  {
    id: 'dijkstra',
    steps: dijkstra([], [[0, 1, 1], [1, 2, 2]], 3, 0),
    source: getDijkstraCatalog().typescript.source,
    anchors: new Set(getDijkstraCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['dist[start] = 0', 'done[u] = true', 'dist[u]! + w < dist[v]', 'return { dist, parent }'],
  },
  {
    id: 'dijkstraHeap',
    steps: dijkstraHeap([], [[0, 1, 1], [1, 2, 2]], 3, 0, { heavyTrace: true }),
    source: getDIJKSTRA_HEAPCatalog().typescript.source,
    anchors: new Set(getDIJKSTRA_HEAPCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['dist[start] = 0', 'cur.d !== dist', 'dist[cur.u]! + w < dist[v]', 'return { dist, parent }'],
  },
  {
    id: 'knapsack.dp2d',
    steps: solveDp2d({
      items: [
        { id: 'a', weight: 2, value: 3 },
        { id: 'b', weight: 3, value: 4 },
      ],
      capacity: 5,
    }).steps,
    source: getKNAPSACK_DP2DCatalog().typescript.source,
    anchors: new Set(getKNAPSACK_DP2DCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['dp[i]![w]', 'take > dp', 'selected.push', 'return { maxValue'],
  },
  {
    id: 'nQueens',
    steps: nQueens([], 4, 'one'),
    source: getN_QUEENSCatalog().typescript.source,
    anchors: new Set(getN_QUEENSCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['function dfs', 'isSafe', 'cols[row] = col', 'cols[row] = -1', 'return solutions'],
  },
  {
    id: 'editDistance',
    steps: editDistance([], 'kitten', 'sitting'),
    source: getEDIT_DISTANCECatalog().typescript.source,
    anchors: new Set(getEDIT_DISTANCECatalog().typescript.anchors.map((a) => a.id)),
    markers: ['a[i - 1] === b[j - 1]', 'Math.min', 'return dp[m]![n]!'],
  },
  {
    id: 'kmp',
    steps: kmp([], 'ABABCABAB', 'ABAB'),
    source: getKMPCatalog().typescript.source,
    anchors: new Set(getKMPCatalog().typescript.anchors.map((a) => a.id)),
    markers: ['buildLps', 'j === pattern.length', 'j = lps', 'return hits'],
  },
]

describe('V5 M1 catalog ↔ generateSteps consistency', () => {
  for (const c of CASES) {
    it(`${c.id}: emitted anchors exist; catalog has control-flow markers`, () => {
      for (const m of c.markers) {
        expect(c.source.includes(m), `${c.id} missing marker ${m}`).toBe(true)
      }
      for (const s of c.steps) {
        for (const ref of s.codeRefs ?? []) {
          expect(c.anchors.has(ref.anchorId), `${c.id} missing anchor ${ref.anchorId}`).toBe(true)
        }
      }
    })

    it(`${c.id}: done/return anchors not borrowed from unrelated ops`, () => {
      const doneSteps = c.steps.filter(
        (s) => s.phase === 'done' || /完成|返回/.test(s.message ?? ''),
      )
      const terminal = doneSteps.length ? doneSteps[doneSteps.length - 1] : c.steps[c.steps.length - 1]
      const aids = (terminal?.codeRefs ?? []).map((r) => r.anchorId)
      if (!aids.length) return
      for (const a of aids) {
        expect(['done', 'return'].includes(a), `${c.id} borrowed terminal anchor ${a}`).toBe(true)
        expect(a).not.toBe('partition')
        expect(a).not.toBe('mergePush')
        expect(a).not.toBe('init')
        expect(a).not.toBe('fill')
        expect(a).not.toBe('loopSwap')
        expect(a).not.toBe('reconstruct')
        expect(a).not.toBe('solution')
      }
      if (c.id === 'nQueens') {
        expect(aids.some((a) => a === 'done' || a === 'return')).toBe(true)
      }
      if (c.id === 'mergeSort' || c.id === 'dijkstraHeap' || c.id === 'dijkstra') {
        expect(aids.some((a) => a === 'done' || a === 'return')).toBe(true)
      }
      if (c.id === 'knapsack.dp2d') {
        expect(aids.some((a) => a === 'done' || a === 'return')).toBe(true)
      }
    })
  }
})
