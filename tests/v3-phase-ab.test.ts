import { describe, expect, it } from 'vitest'
import { generateSteps as bubble } from '../src/algorithms/bubbleSort'
import { generateSteps as insertion } from '../src/algorithms/insertionSort'
import { generateSteps as quick } from '../src/algorithms/quickSort'
import { generateSteps as merge } from '../src/algorithms/mergeSort'
import { generateSteps as dijkstra } from '../src/algorithms/dijkstra'
import { getDijkstraCatalog, DIJKSTRA_TS_HASH } from '../src/codeCatalog/dijkstra'
import { createRunId, freezeRunSnapshot } from '../src/core/runSnapshot'
import { roundTripScene, SCENE_PROTOCOL_VERSION } from '../src/scene'

describe('A3 explicit arrayOps', () => {
  it('bubble emits compare/swap ops — never rely on highlights.length alone', () => {
    const steps = bubble([3, 1, 2])
    const swaps = steps.filter((s) => s.arrayOps?.a?.some((o) => o.type === 'swap'))
    const compares = steps.filter((s) => s.arrayOps?.a?.some((o) => o.type === 'compare'))
    expect(swaps.length).toBeGreaterThan(0)
    expect(compares.length).toBeGreaterThan(0)
    expect(steps.every((s) => s.elementIds?.a?.length === 3)).toBe(true)
  })

  it('insertion/quick/merge emit ops with stable elementIds', () => {
    for (const gen of [insertion, quick, merge]) {
      const steps = gen([4, 2, 2, 1])
      expect(steps.some((s) => (s.arrayOps?.a?.length ?? 0) > 0)).toBe(true)
      const last = steps[steps.length - 1]!
      expect(last.elementIds?.a?.length).toBe(4)
      // duplicate values keep distinct ids
      const ids = new Set(steps[0]!.elementIds!.a)
      expect(ids.size).toBe(4)
    }
  })
})

describe('A4 RunSnapshot scene', () => {
  it('freeze + roundtrip with runSnapshot', () => {
    const snap = freezeRunSnapshot({
      algoId: 'bubbleSort',
      version: SCENE_PROTOCOL_VERSION,
      input: { arr: [1, 2] },
      params: { mode: 'teach' },
      seed: 0,
      runId: createRunId(),
    })
    const scene = roundTripScene({
      version: SCENE_PROTOCOL_VERSION,
      algoId: 'bubbleSort',
      input: snap.input,
      params: snap.params,
      seed: 0,
      stepIndex: 2,
      runSnapshot: { ...snap },
    })
    expect(scene.stepIndex).toBe(2)
    expect(scene.runSnapshot?.runId).toBe(snap.runId)
  })
})

describe('B1 Dijkstra catalog + codeRefs', () => {
  it('catalog has anchors and sourceHash', () => {
    const cat = getDijkstraCatalog()
    expect(cat.typescript.sourceHash).toBe(DIJKSTRA_TS_HASH)
    const ids = cat.typescript.anchors.map((a) => a.id)
    expect(ids).toEqual(
      expect.arrayContaining(['init', 'selectMin', 'relax.condition', 'relax.update']),
    )
    expect(cat.typescript.anchors.every((a) => a.range.startLine >= 1)).toBe(true)
  })

  it('generator emits codeRefs at real ops', () => {
    const steps = dijkstra([], undefined, 6, 0)
    const withRefs = steps.filter((s) => (s.codeRefs?.length ?? 0) > 0)
    expect(withRefs.length).toBeGreaterThan(3)
    const anchors = new Set(withRefs.flatMap((s) => s.codeRefs!.map((r) => r.anchorId)))
    expect(anchors.has('init')).toBe(true)
    expect(anchors.has('selectMin')).toBe(true)
    expect(anchors.has('relax.condition')).toBe(true)
  })
})
