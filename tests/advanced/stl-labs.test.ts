import { describe, it, expect } from 'vitest'
import golden from './stl-golden.json'
import { advancedEntries } from '../../src/algorithms/advanced/registry'
import { simVector } from '../../src/algorithms/advanced/stlVector'
import { solveAdvanced } from '../../src/algorithms/advanced/registry'
import type { LabOp } from '../../src/algorithms/advanced/famTypes'

const G = golden as Record<string, { fields: Record<string, string>; lines: string[] }[]>
const solve = (id: string, draft: Record<string, string>) => {
  const p = advancedEntries[id as keyof typeof advancedEntries].parseDraft(draft)
  if (!p.ok) throw new Error(JSON.stringify(p.issues))
  const r = solveAdvanced(id, p.value)
  if (!r.ok) throw new Error('solve failed')
  return r
}
const op = (t: string, ...n: number[]): LabOp => ({ t, n, w: [] })

describe('STL labs: TypeScript simulator equals the REAL libstdc++ golden (recorded by scripts/advanced-validate.mjs under g++ ASan+UBSan)', () => {
  for (const id of Object.keys(G)) {
    it(`${id}: ${G[id]!.length} golden cases`, () => {
      for (const c of G[id]!) {
        const r = solve(id, c.fields).result as { states: string[]; ok: boolean }
        expect(r.ok, JSON.stringify(c.fields)).toBe(true)
        expect(r.states, JSON.stringify(c.fields)).toEqual(c.lines)
      }
    })
  }
})

describe('stl-vector: iterator rules and honest stops', () => {
  it('reallocation invalidates the iterator, and using it stops BEFORE the call (no invented value)', () => {
    const r = simVector([1, 2, 3], [op('it', 1), op('push', 4), op('use')])
    expect(r.ok).toBe(false)
    expect(r.stoppedAt).toBe(3)
    expect(r.reason).toContain('未定义行为')
    expect(r.states).toHaveLength(2)
  })
  it('reserve first: no reallocation, the iterator stays valid', () => {
    const r = simVector([1, 2, 3], [op('reserve', 8), op('it', 1), op('push', 4), op('use')])
    expect(r.ok).toBe(true)
    expect(r.states[2]).toBe('size=4 cap=8 re=0 [1 2 3 4]')
  })
  it('erase invalidates at-and-after the erase point; before stays valid', () => {
    expect(simVector([1, 2, 3, 4], [op('it', 3), op('erase', 1), op('use')]).ok).toBe(false)
    expect(simVector([1, 2, 3, 4], [op('it', 0), op('erase', 2), op('use')]).ok).toBe(true)
  })
  it('reserve does not create elements; resize does (value 0)', () => {
    expect(simVector([], [op('reserve', 5)]).states[0]).toBe('size=0 cap=5 re=1 []')
    expect(simVector([], [op('resize', 3)]).states[0]).toBe('size=3 cap=3 re=1 [0 0 0]')
  })
  it('insert out of range / erase on empty are stopped, not simulated', () => {
    expect(simVector([1], [op('insert', 5, 9)]).ok).toBe(false)
    expect(simVector([], [op('erase', 0)]).ok).toBe(false)
  })
  it('counterexample: assuming reserve(n) makes v[i] legal — size stays 0 after reserve', () => {
    const r = simVector([], [op('reserve', 4)])
    expect(r.finalSize).toBe(0)
    expect(r.finalCap).toBe(4)
  })
})
