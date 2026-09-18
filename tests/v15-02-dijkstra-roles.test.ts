import { describe, expect, it } from 'vitest'
import { generateSteps, solveDijkstraNaive } from '../src/algorithms/dijkstra'
import { generateSteps as heapSteps } from '../src/algorithms/dijkstraHeap'
import { generateSteps as bfsSteps } from '../src/algorithms/bfs'
import { generateSteps as primSteps } from '../src/algorithms/prim'
import { directedEdgeId } from '../src/utils/edgeId'

/** Classic V15 case: 0→1:10 superseded by 0→2→1 */
const EDGES: [number, number, number][] = [
  [0, 1, 10],
  [0, 2, 1],
  [2, 1, 1],
]
const N = 3
const START = 0

describe('V15-02 Dijkstra visual roles', () => {
  it('numeric solver: dist [0,2,1] parent [-1,2,0]', () => {
    const r = solveDijkstraNaive(EDGES, N, START)
    expect(r.ok).toBe(true)
    expect(r.dist).toEqual([0, 2, 1])
    expect(r.parent).toEqual([-1, 2, 0])
  })

  it('final current predecessors only 0→2 and 2→1; 0→1 must NOT be tree/accepted/path', () => {
    const steps = generateSteps([], EDGES, N, START)
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ ok: true, dist: [0, 2, 1], parent: [-1, 2, 0] })
    const roles = last.graph?.edgeRoles ?? {}
    const e01 = directedEdgeId(0, 1)
    const e02 = directedEdgeId(0, 2)
    const e21 = directedEdgeId(2, 1)
    expect(roles[e02]).toBe('tree')
    expect(roles[e21]).toBe('tree')
    expect(roles[e01]).not.toBe('tree')
    expect(roles[e01]).not.toBe('accepted')
    expect(roles[e01]).not.toBe('path')
    // historical must not share current style — undefined/empty role is fine
    expect(['tree', 'accepted', 'path'].includes(roles[e01] as string)).toBe(false)
  })

  it('successful update snap uses accepted, not checking overwrite', () => {
    const steps = generateSteps([], EDGES, N, START)
    const updates = steps.filter((s) => s.message.startsWith('更新 dist['))
    expect(updates.length).toBeGreaterThan(0)
    for (const s of updates) {
      const roles = s.graph?.edgeRoles ?? {}
      const successIds = Object.entries(roles)
        .filter(([, r]) => r === 'accepted')
        .map(([id]) => id)
      expect(successIds.length).toBeGreaterThan(0)
      for (const id of successIds) {
        expect(roles[id]).not.toBe('checking')
      }
    }
  })

  it('extract frame keeps highlightNodes while node is settled (focus overlay contract)', () => {
    const steps = generateSteps([], EDGES, N, START)
    const extract = steps.find((s) => s.phase === 'extract' && s.vars?.u === 0)
    expect(extract).toBeTruthy()
    expect(extract!.graph?.highlightNodes).toContain(0)
    expect(extract!.graph?.nodeRoles?.['0']).toBe('settled')
  })

  it('current preds always derived from parent snapshot (mid-run after 0→1 then 2→1)', () => {
    const steps = generateSteps([], EDGES, N, START)
    // After first update of dist[1]=10 via 0→1, parent[1]=0 → tree includes 0→1
    const after01 = steps.find((s) => s.message.includes('更新 dist[1] = 10'))
    expect(after01).toBeTruthy()
    expect(after01!.graph?.edgeRoles?.[directedEdgeId(0, 1)]).toMatch(/tree|accepted/)
    // After update dist[1]=2 via 2→1, 0→1 must drop current style
    const after21 = steps.find((s) => s.message.includes('更新 dist[1] = 2'))
    expect(after21).toBeTruthy()
    const roles = after21!.graph?.edgeRoles ?? {}
    expect(roles[directedEdgeId(2, 1)]).toMatch(/tree|accepted/)
    expect(['tree', 'accepted', 'path'].includes(roles[directedEdgeId(0, 1)] as string)).toBe(false)
  })

  it('heap dijkstra heavy frames: final preds from parent; success ≠ checking', () => {
    const steps = heapSteps([], EDGES, N, START, { heavyTrace: true })
    const last = steps[steps.length - 1]!
    expect(last.result).toMatchObject({ dist: [0, 2, 1], parent: [-1, 2, 0] })
    const roles = last.graph?.edgeRoles ?? {}
    expect(roles[directedEdgeId(0, 2)]).toBe('tree')
    expect(roles[directedEdgeId(2, 1)]).toBe('tree')
    expect(['tree', 'accepted', 'path'].includes(roles[directedEdgeId(0, 1)] as string)).toBe(false)
    const relaxOk = steps.filter((s) => s.message.startsWith('松弛：dist['))
    for (const s of relaxOk) {
      const er = s.graph?.edgeRoles ?? {}
      for (const [id, r] of Object.entries(er)) {
        if (r === 'accepted') expect(er[id]).not.toBe('checking')
      }
    }
  })

  it('regression: BFS tree roles and Prim still emit tree/accepted edges', () => {
    const bfs = bfsSteps([], { 0: [1, 2], 1: [], 2: [1] }, 0)
    const bfsLast = bfs[bfs.length - 1]!
    const bfsRoles = Object.values(bfsLast.graph?.edgeRoles ?? {})
    expect(bfsRoles.some((r) => r === 'tree')).toBe(true)

    const prim = primSteps([], [[0, 1, 1], [1, 2, 2], [0, 2, 5]], 3, 0)
    const primLast = prim[prim.length - 1]!
    const primRoles = Object.values(primLast.graph?.edgeRoles ?? {})
    expect(primRoles.some((r) => r === 'tree' || r === 'accepted')).toBe(true)
  })
})
