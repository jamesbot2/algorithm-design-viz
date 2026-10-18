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

import { simDeque } from '../../src/algorithms/advanced/stlDeque'
import { simSetMap } from '../../src/algorithms/advanced/stlSetMap'

describe('stl-deque', () => {
  it('slots are stable: an element keeps its slot while both ends grow and shrink', () => {
    const slots: Record<number, number>[] = []
    simDeque([1, 2, 3], [op('pushf', 0), op('pushb', 4), op('popf')], (_, s) => slots.push(Object.fromEntries(s.slots)))
    for (const m of slots) for (const [k, v] of Object.entries(m)) if (v === 2) expect(k).toBe('1')
  })
  it('front/back/pop on an empty deque stop BEFORE the call', () => {
    for (const t of ['front', 'back', 'popb', 'popf']) {
      const r = simDeque([], [op(t)])
      expect(r.ok).toBe(false)
      expect(r.reason).toContain('未定义行为')
      expect(r.states).toHaveLength(0)
    }
  })
  it('pushb 4 / pushf 0 / front / back on [1,2,3] matches the real-g++ sample', () => {
    expect(simDeque([1, 2, 3], [op('pushf', 0), op('pushb', 4), op('front'), op('back'), op('popf'), op('popb')]).states).toEqual(['r=- size=4 [0 1 2 3]', 'r=- size=5 [0 1 2 3 4]', 'r=0 size=5 [0 1 2 3 4]', 'r=4 size=5 [0 1 2 3 4]', 'r=- size=4 [1 2 3 4]', 'r=- size=3 [1 2 3]'])
  })
})

describe('stl-set-map', () => {
  it('map[] reads insert: mapget on a missing key leaves key→0 in the map; mapfind never inserts', () => {
    expect(simSetMap([op('mapget', 7)]).P).toEqual([[7, 0]])
    expect(simSetMap([op('mapfind', 7)]).P).toEqual([])
  })
  it('multiset: erase(value) removes ALL copies, erase(find) removes ONE', () => {
    const base = [op('mins', 3), op('mins', 3), op('mins', 3)]
    expect(simSetMap([...base, op('mdel', 3)]).M).toEqual([])
    expect(simSetMap([...base, op('mdel1', 3)]).M).toEqual([3, 3])
  })
  it('set insert of an existing key returns 0 and changes nothing; lower_bound past the end is "end"', () => {
    const r = simSetMap([op('sins', 5), op('sins', 5), op('slb', 6)])
    expect(r.states[1]).toBe('r=0 S=[5] M=[] P=[]')
    expect(r.states[2]).toBe('r=end S=[5] M=[] P=[]')
  })
})

describe('stl-unique', () => {
  const run = (arr: number[], mode: number, x = 0) => {
    const p = advancedEntries['stl-unique'].parseDraft({ arr: arr.join(','), mode: String(mode), x: String(x) })
    if (!p.ok) throw new Error('bad')
    return solveAdvanced('stl-unique', p.value) as { ok: true; steps: { message: string }[]; result: { k: number; kept: number[]; final: number[] } }
  }
  it('counterexample: without sort, unique keeps the non-adjacent 1 → [1,2,3,1]; with sort → [1,2,3]; size is unchanged before erase', () => {
    const a = [1, 1, 2, 2, 2, 3, 1, 1]
    expect(run(a, 0).result.kept).toEqual([1, 2, 3, 1])
    expect(run(a, 2).result.kept).toEqual([1, 2, 3])
    expect(run(a, 2).steps.some((s) => s.message.includes('size() 仍然是 8'))).toBe(true)
  })
  it('remove x keeps order of the others', () => {
    expect(run([1, 2, 1, 3, 2], 1, 2).result.kept).toEqual([1, 1, 3])
  })
})

import { simString } from '../../src/algorithms/advanced/stlString'
import { simAlgo } from '../../src/algorithms/advanced/stlAlgo'
import { simNumeric } from '../../src/algorithms/advanced/stlNumeric'
import { simComparator } from '../../src/algorithms/advanced/stlComparator'
const wop = (t: string, n: number[], w: string[]): LabOp => ({ t, n, w })

describe('stl-string', () => {
  it('find failure is npos (never -1); rfind returns the LAST occurrence', () => {
    const r = simString('abcabab', [wop('find', [], ['zz']), wop('rfind', [], ['ab']), wop('find', [], ['ab'])])
    expect(r.states.map((s) => s.split(' ')[0])).toEqual(['r=npos', 'r=5', 'r=0'])
  })
  it('substr at pos == size is legal and empty; pos > size stops BEFORE the call', () => {
    expect(simString('abc', [wop('sub', [3, 2], [])]).states[0]).toBe('r= s=abc')
    const r = simString('abc', [wop('sub', [4, 1], [])])
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('out_of_range')
    expect(r.states).toHaveLength(0)
  })
  it('erase clamps n to the end; insert/erase out of range are stopped', () => {
    expect(simString('abcde', [wop('ers', [3, 30], [])]).final).toBe('abc')
    expect(simString('ab', [wop('ins', [3], ['x'])]).ok).toBe(false)
  })
  it('pair / tuple order is lexicographic', () => {
    expect(simString('', [wop('pless', [1, 9, 2, 0], []), wop('pless', [2, 1, 2, 1], []), wop('tless', [1, 2, 3, 1, 2, 4], []), wop('tless', [1, 2, 4, 1, 2, 3], [])]).states.map((s) => s[2])).toEqual(['1', '0', '1', '0'])
  })
})

describe('stl-algo', () => {
  it('counterexample: next_permutation from an unsorted start does not visit all permutations', () => {
    const seen = new Set<string>()
    const ops = Array.from({ length: 12 }, () => wop('nperm', [], []))
    const r = simAlgo([3, 1, 2], ops)
    r.states.forEach((s) => seen.add(s.split('v=')[1]!))
    expect(r.states[0]).toBe('r=1 v=[3 2 1]')
    expect(r.states[1]).toBe('r=0 v=[1 2 3]') // wraps around, returns false
    const sortedStart = simAlgo([1, 2, 3], Array.from({ length: 5 }, () => wop('nperm', [], []))).states.map((s) => s.split('v=')[1])
    expect(new Set(sortedStart).size).toBe(5)
  })
  it('lower_bound / rot / nth guard the preconditions instead of inventing results', () => {
    expect(simAlgo([3, 1, 2], [wop('lbd', [2], [])]).ok).toBe(false)
    expect(simAlgo([3, 1, 2], [wop('rot', [4], [])]).ok).toBe(false)
    expect(simAlgo([3, 1, 2], [wop('nth', [3], [])]).ok).toBe(false)
    expect(simAlgo([3, 1, 2], [wop('srt', [], []), wop('lbd', [2], [])]).states[1]).toBe('r=1 v=[1 2 3]')
  })
  it('nth_element reports the k-th smallest and leaves the shown array unchanged', () => {
    expect(simAlgo([5, 1, 4, 2], [wop('nth', [2], [])]).states[0]).toBe('r=4 v=[5 1 4 2]')
  })
})

describe('stl-numeric', () => {
  it('psum then adiff restores the array; gcd of zeros is 0; bitset indices count from the right', () => {
    expect(simNumeric([4, 6, 8, 10], [wop('psum', [], []), wop('adiff', [], [])]).final).toEqual([4, 6, 8, 10])
    expect(simNumeric([0, 0], [wop('gcdall', [], [])]).states[0]!.startsWith('r=0 ')).toBe(true)
    expect(simNumeric([-4, 6], [wop('gcdall', [], [])]).states[0]!.startsWith('r=2 ')).toBe(true)
    expect(simNumeric([1], [wop('bset', [3], [])]).bits).toBe('0000000000001000')
    expect(simNumeric([1], [wop('bset', [15], []), wop('bshl', [1], [])]).bits).toBe('0000000000000000') // bit 15 shifted out
  })
})

describe('stl-comparator', () => {
  it('stable_sort keeps the order of equal first keys; sort by lex is a total order', () => {
    expect(simComparator([[2, 5], [1, 5], [2, 3], [1, 9]], [wop('sfirst', [], [])]).final).toEqual([[1, 5], [1, 9], [2, 5], [2, 3]])
    expect(simComparator([[2, 5], [1, 5], [2, 3], [1, 9]], [wop('sortlex', [], [])]).final).toEqual([[1, 5], [1, 9], [2, 3], [2, 5]])
  })
  it('lower_bound by first is refused unless sorted by first right before', () => {
    expect(simComparator([[2, 5], [1, 5]], [wop('lbf', [1], [])]).ok).toBe(false)
    expect(simComparator([[2, 5], [1, 5]], [wop('sfirst', [], []), wop('lbf', [2], [])]).states[1]).toBe('r=1 v=[1:5 2:5]')
  })
  it('min_element returns the FIRST minimum under ByFirst', () => {
    expect(simComparator([[2, 1], [1, 7], [1, 3]], [wop('minel', [], [])]).states[0]).toBe('r=1 v=[2:1 1:7 1:3]')
  })
})
