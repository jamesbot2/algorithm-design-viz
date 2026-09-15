import { describe, expect, it } from 'vitest'
import {
  judgeGreedyCounterexample,
  judgeChoices,
  judgeByKey,
  parseGreedyCeInput,
} from '../src/practice/judges'
import { getPracticeItem, listPracticeItems } from '../src/practice/bank'
import { solveNQueens } from '../src/algorithms/nQueens'
import { solveBacktracking } from '../src/algorithms/knapsack/backtracking'
import { solveBranchAndBound } from '../src/algorithms/knapsack/branchAndBound'
import { DEFAULT_INSTANCE, GREEDY_COUNTEREXAMPLE } from '../src/algorithms/knapsack/types'
import {
  runMaxSubarrayCompare,
  runKnapsackStrategiesCompare,
  runDijkstraCompare,
  countKadaneOps,
} from '../src/experiment/runners'
import {
  roundTripScene,
  validateScene,
  sceneToHashFragment,
  sceneFromHashFragment,
  SCENE_PROTOCOL_VERSION,
} from '../src/scene'
import { motion, motionCssVars } from '../src/theme/motion'
import { semanticColors, semanticCssVars } from '../src/theme/semanticColors'

describe('V2 P0: greedy counterexample structured judge', () => {
  it('rejects random numbers alone', () => {
    const r = judgeGreedyCounterexample('42 17 99')
    expect(r.ok).toBe(false)
  })

  it('rejects non-counterexample instance (greedy == optimal)', () => {
    const r = judgeGreedyCounterexample({
      weights: '1,2',
      values: '3,4',
      capacity: '10',
    })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/不是反例|gap=0/)
  })

  it('passes classic w[10,20,30] v[60,100,120] W=50', () => {
    const r = judgeGreedyCounterexample({
      weights: '10,20,30',
      values: '60,100,120',
      capacity: '50',
    })
    expect(r.ok).toBe(true)
    expect(r.message).toMatch(/贪心=160/)
    expect(r.message).toMatch(/最优=220/)
    expect(r.message).toMatch(/gap=60/)
  })

  it('accepts compact text form', () => {
    const r = judgeGreedyCounterexample('w=10,20,30 v=60,100,120 cap=50')
    expect(r.ok).toBe(true)
  })

  it('parseGreedyCeInput validates shape', () => {
    expect(parseGreedyCeInput({ weights: '1', values: '2,3', capacity: '5' }).ok).toBe(true)
    const bad = parseGreedyCeInput('hello')
    expect(bad.ok).toBe(false)
  })
})

describe('V2 P0: N-queens practice bank + multiExact', () => {
  it('nqueens-predict-1 does not accept incomplete option c', () => {
    const item = getPracticeItem('nqueens-predict-1')!
    expect(item).toBeTruthy()
    if (item.type !== 'predict_next') throw new Error('type')
    expect(item.judgeMode).toBe('single')
    expect(item.acceptIds).toEqual(['b'])
    expect(judgeChoices(['c'], item.acceptIds, 'single').ok).toBe(false)
    expect(judgeChoices(['b'], item.acceptIds, 'single').ok).toBe(true)
    expect(judgeChoices(['b', 'c'], item.acceptIds, 'single').ok).toBe(false)
  })

  it('multiExact requires complete set match', () => {
    const item = getPracticeItem('nqueens-multi-1')!
    expect(item.type).toBe('predict_next')
    if (item.type !== 'predict_next') return
    expect(item.judgeMode).toBe('multiExact')
    expect(judgeChoices(['a', 'b'], item.acceptIds, 'multiExact').ok).toBe(false) // incomplete
    expect(judgeChoices(['a', 'b', 'c'], item.acceptIds, 'multiExact').ok).toBe(true)
    expect(judgeChoices(['a', 'b', 'c', 'd'], item.acceptIds, 'multiExact').ok).toBe(false)
  })

  it('bank configs declare judgeMode for all items', () => {
    for (const item of listPracticeItems()) {
      expect(item.judgeMode).toBeTruthy()
      if (item.type === 'predict_next' || item.type === 'explain_choice') {
        expect(['single', 'multiExact']).toContain(item.judgeMode)
        expect(item.acceptIds.length).toBeGreaterThan(0)
      } else {
        expect(['construct', 'path', 'setOptimal']).toContain(item.judgeMode)
      }
    }
  })

  it('single mode rejects multi-select', () => {
    expect(judgeChoices(['a', 'b'], ['a'], 'single').ok).toBe(false)
  })
})

describe('V2 P0: searchTree immutability', () => {
  it('nQueens steps have distinct tree snapshots; mutate later does not change earlier', () => {
    const { steps } = solveNQueens(4, 'all')
    expect(steps.length).toBeGreaterThan(2)
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        if (steps[i]!.searchTree && steps[j]!.searchTree) {
          expect(steps[i]!.searchTree).not.toBe(steps[j]!.searchTree)
        }
      }
    }
    const early = steps[0]!.searchTree!
    const earlyChildCount = early.children?.length ?? 0
    const late = steps[steps.length - 1]!.searchTree!
    late.children = late.children ?? []
    late.children.push({ id: 'mut', label: 'MUT', status: 'exploring' })
    expect(early.children?.length ?? 0).toBe(earlyChildCount)
    expect(early.children?.some((c) => c.id === 'mut')).toBeFalsy()
  })

  it('knapsack BT/BB step trees are distinct snapshots', () => {
    const bt = solveBacktracking(DEFAULT_INSTANCE, { maxNodes: 200 })
    expect(bt.steps.length).toBeGreaterThanOrEqual(2)
    expect(bt.steps[0]!.searchTree).not.toBe(bt.steps[1]!.searchTree)
    const firstKids = bt.steps[0]!.searchTree!.children?.length ?? 0
    bt.steps[1]!.searchTree!.children?.push({ id: 'x', label: 'x', status: 'exploring' })
    expect(bt.steps[0]!.searchTree!.children?.length ?? 0).toBe(firstKids)

    const bb = solveBranchAndBound(GREEDY_COUNTEREXAMPLE)
    expect(bb.steps.length).toBeGreaterThanOrEqual(2)
    expect(bb.steps[0]!.searchTree).not.toBe(bb.steps[bb.steps.length - 1]!.searchTree)
  })
})

describe('V2 P0: experiment real counters (not vizSteps as work)', () => {
  it('max-subarray emits comparisons/scans and separate vizSteps', () => {
    const res = runMaxSubarrayCompare([12], 1)
    const metrics = new Set(res.rows.map((r) => r.metric))
    expect(metrics.has('comparisons')).toBe(true)
    expect(metrics.has('scans')).toBe(true)
    expect(metrics.has('vizSteps')).toBe(true)
    const kadaneComp = res.rows.find((r) => r.method === 'kadane' && r.metric === 'comparisons')!
    const kadaneViz = res.rows.find((r) => r.method === 'kadane' && r.metric === 'vizSteps')!
    expect(kadaneComp.value).not.toBe(kadaneViz.value)
    expect(res.notes.some((n) => n.includes('可视化步骤量'))).toBe(true)
    // claimed work counters exist
    const ops = countKadaneOps([1, -2, 3])
    expect(ops.scans).toBe(3)
    expect(ops.comparisons).toBeGreaterThan(0)
  })

  it('knapsack emits dpStates/btNodes etc.', () => {
    const res = runKnapsackStrategiesCompare([4], 1)
    expect(res.rows.some((r) => r.metric === 'dpStates')).toBe(true)
    expect(res.rows.some((r) => r.metric === 'btNodes')).toBe(true)
    expect(res.rows.some((r) => r.metric === 'vizSteps')).toBe(true)
  })

  it('dijkstra emits scans/heapPops/staleSkips/relaxations', () => {
    const res = runDijkstraCompare([{ n: 6, m: 10 }], 2)
    const metrics = new Set(res.rows.map((r) => r.metric))
    expect(metrics.has('scans')).toBe(true)
    expect(metrics.has('heapPops')).toBe(true)
    expect(metrics.has('staleSkips')).toBe(true)
    expect(metrics.has('relaxations')).toBe(true)
  })
})

describe('V2 P0: scene encode/decode + seek fields', () => {
  it('roundtrip preserves stepIndex', () => {
    const scene = {
      version: SCENE_PROTOCOL_VERSION,
      algoId: 'dijkstra',
      input: { n: 3, edges: [[0, 1, 1]] as [number, number, number][], directed: true, start: 0 },
      params: { mode: 'teach' },
      seed: 7,
      stepIndex: 5,
    }
    const back = roundTripScene(scene)
    expect(back.stepIndex).toBe(5)
    expect(back.algoId).toBe('dijkstra')
  })

  it('version mismatch is hard error (no silent fallback)', () => {
    const v = validateScene({
      version: 999,
      algoId: 'bfs',
      input: {},
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toMatch(/版本/)
  })

  it('rejects bad structure and oversize', () => {
    expect(validateScene({ version: 1, algoId: 'bfs', input: 'nope' }).ok).toBe(false)
    expect(validateScene({ version: 1 }).ok).toBe(false)
    const huge = {
      version: SCENE_PROTOCOL_VERSION,
      algoId: 'bfs',
      input: { pad: 'x'.repeat(20_000) },
      stepIndex: 0,
    }
    expect(sceneToHashFragment(huge)).toBeNull()
  })

  it('decode seek index from fragment', () => {
    const frag = sceneToHashFragment({
      version: SCENE_PROTOCOL_VERSION,
      algoId: 'kruskal',
      input: { n: 2, edges: [[0, 1, 1]], directed: false, start: 0 },
      stepIndex: 3,
    })
    expect(frag).toBeTruthy()
    const loaded = sceneFromHashFragment(`?${frag}`)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.scene.stepIndex).toBe(3)
  })
})

describe('V2 M2 start: motion + semantic tokens', () => {
  it('exports duration/easing tokens and css vars', () => {
    expect(motion.duration.fast).toBeGreaterThan(0)
    expect(motion.easing.standard).toContain('cubic-bezier')
    expect(motionCssVars()['--motion-step']).toMatch(/ms/)
    expect(semanticColors.focus).toContain('--sem-focus')
    expect(semanticCssVars()['--sem-compare']).toBeTruthy()
  })
})

describe('V2: judgeByKey greedy_ce wiring', () => {
  it('judgeByKey greedy_ce uses structured answer', () => {
    const r = judgeByKey(
      'greedy_ce',
      { weights: '10,20,30', values: '60,100,120', capacity: '50' },
      {},
    )
    expect(r.ok).toBe(true)
  })
})
