import { describe, expect, it } from 'vitest'
import { judgeByKey, judgeChoices, judgeLcsConstruct, judgeKnapsackSet } from '../src/practice/judges'
import { pickPracticeItem, listPracticeItems } from '../src/practice/bank'
import { roundTripScene, validateScene, SCENE_PROTOCOL_VERSION } from '../src/scene'
import {
  exportExperimentCsv,
  exportExperimentJson,
  runDijkstraCompare,
  runKnapsackStrategiesCompare,
  runMaxSubarrayCompare,
} from '../src/experiment'

describe('M3 practice multi-answer judges', () => {
  it('accepts any optimal LCS', () => {
    const x = 'ABCBDAB'
    const y = 'BDCABA'
    const a = judgeLcsConstruct('BCBA', { x, y })
    const b = judgeLcsConstruct('BDAB', { x, y })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(judgeLcsConstruct('ABC', { x, y }).ok).toBe(false)
  })

  it('accepts optimal knapsack sets', () => {
    const payload = { weights: [2, 3, 4], values: [3, 4, 5], capacity: 5 }
    expect(judgeKnapsackSet('0,1', payload).ok).toBe(true)
    expect(judgeKnapsackSet('2', payload).ok).toBe(false) // value 5 < 7
  })

  it('equal-length shortest path', () => {
    const r = judgeByKey(
      'equal_path',
      '0 1 2 3',
      {
        edges: [
          [0, 1, 1],
          [0, 2, 4],
          [1, 2, 2],
          [1, 3, 6],
          [2, 3, 3],
        ],
        n: 4,
        start: 0,
        target: 3,
      },
    )
    expect(r.ok).toBe(true)
  })

  it('MST alternate edges same weight', () => {
    const r = judgeByKey(
      'mst_alt',
      '0 1\n0 2\n1 3',
      {
        edges: [
          [0, 1, 1],
          [0, 2, 1],
          [1, 2, 1],
          [1, 3, 2],
          [2, 3, 2],
        ],
        n: 4,
        optimalCost: 4,
        treeEdges: 3,
      },
    )
    expect(r.ok).toBe(true)
  })

  it('choice judge single mode accepts one of acceptIds', () => {
    expect(judgeChoices(['b'], ['b', 'c'], 'single').ok).toBe(true)
    expect(judgeChoices(['a'], ['b', 'c'], 'single').ok).toBe(false)
  })

  it('seeded pick is reproducible', () => {
    const a = pickPracticeItem(12345)
    const b = pickPracticeItem(12345)
    expect(a.id).toBe(b.id)
    expect(listPracticeItems().length).toBeGreaterThanOrEqual(10)
  })
})

describe('M3 scene roundtrip', () => {
  it('hash roundtrip preserves fields', () => {
    const scene = {
      version: SCENE_PROTOCOL_VERSION,
      algoId: 'dijkstra',
      input: { n: 3, edges: [[0, 1, 1]] as [number, number, number][], directed: true, start: 0 },
      params: { mode: 'teach' },
      seed: 7,
      stepIndex: 2,
    }
    const back = roundTripScene(scene)
    expect(back.algoId).toBe('dijkstra')
    expect(back.stepIndex).toBe(2)
    expect(back.input).toEqual(scene.input)
  })

  it('version mismatch rejected (no silent fallback)', () => {
    const v = validateScene({
      version: 999,
      algoId: 'bfs',
      input: {},
    })
    expect(v.ok).toBe(false)
  })

  it('rejects missing algoId', () => {
    expect(validateScene({ version: 1 }).ok).toBe(false)
  })
})

describe('M3 experiment export shape', () => {
  it('dijkstra compare rows + csv/json', () => {
    const res = runDijkstraCompare([{ n: 8, m: 12 }], 1)
    expect(res.rows.length).toBeGreaterThanOrEqual(2)
    expect(res.rows[0]).toMatchObject({
      experiment: 'dijkstra',
      method: expect.any(String),
      n: 8,
      metric: expect.any(String),
      value: expect.any(Number),
    })
    const csv = exportExperimentCsv(res.rows)
    expect(csv.split('\n')[0]).toContain('experiment,method,n,metric,value')
    const json = JSON.parse(exportExperimentJson(res))
    expect(json.rows.length).toBe(res.rows.length)
    expect(json.notes.length).toBeGreaterThan(0)
  })

  it('max-subarray and knapsack experiments', () => {
    const a = runMaxSubarrayCompare([10], 1)
    expect(a.rows.some((r) => r.method === 'kadane')).toBe(true)
    const b = runKnapsackStrategiesCompare([4], 1)
    expect(b.rows.some((r) => r.method === 'dp2d')).toBe(true)
  })
})
