/**
 * V25 acceptance (phase 2): legacy code-ref defects reproduced in the real page.
 * Expected statements are written from each CodeDocument's own text (what the frame
 * reports as executed), NOT from the generator's anchor ids, so a ref that points at
 * a different statement fails here. No global line offset is involved.
 */
import { describe, expect, it } from 'vitest'
import { getCatalog } from '../src/codeCatalog'
import { pickPrimaryCodeRef, weakContextRefs } from '../src/utils/codeRefs'
import { generateSteps as kmp } from '../src/algorithms/kmp'
import { generateSteps as bfs } from '../src/algorithms/bfs'
import { generateSteps as floyd } from '../src/algorithms/floyd'
import type { Step } from '../src/types/step'

function shown(id: string, s: Step) {
  const doc = getCatalog(id)!.typescript
  const L = doc.source.split('\n')
  const p = pickPrimaryCodeRef(s)
  if (!p) return { line: 0, text: '未映射', ctx: [] as string[] }
  expect(p.documentId, `${id}: ref document`).toBe(doc.documentId)
  const a = doc.anchors.find((x) => x.id === p.anchorId)
  expect(a, `${id}: anchor ${p.anchorId} exists`).toBeTruthy()
  const ctx = weakContextRefs(s).map((r) => {
    const c = doc.anchors.find((x) => x.id === r.anchorId)!
    return L[c.range.startLine - 1]!.trim()
  })
  return { line: a!.range.startLine, text: L[a!.range.startLine - 1]!.trim(), ctx }
}

// ---------------------------------------------------------------- KMP
const KMP_RULES: [RegExp, string, string?][] = [
  [/^空模式/, 'if (!pattern) return [0]'],
  [/^构建 π\/next/, 'const lps = buildLps(pattern)'],
  [/^比较 p\[/, 'if (pattern[i] === pattern[len]) {'],
  [/^匹配，next\[/, 'len++', 'if (pattern[i] === pattern[len]) {'],
  [/^失配，len ← /, 'len = lps[len - 1]!', '} else if (len > 0) {'],
  [/^next\[\d+\]=0/, 'lps[i] = 0'],
  [/^π\/next = /, 'return lps'],
  [/^比较 t\[/, 'if (text[i] === pattern[j]) {'],
  [/^匹配成功/, 'hits.push(i - j)'],
  [/^失配，模式串跳转/, 'j = lps[j - 1]!', '} else if (j > 0) {'],
  [/^失配且 j=0/, 'i++'],
  [/^完成/, 'return hits'],
]
const KMP_INPUTS: [string, string][] = [
  ['ABABCABABABD', 'ABABD'],
  ['AAAA', 'AA'],
  ['ABC', 'D'],
  ['ABC', ''],
  ['AABAACAADAABAABA', 'AABA'],
]

describe('V25 acceptance: KMP frames point at the statement they report', () => {
  for (const [t, p] of KMP_INPUTS) {
    it(`text=${JSON.stringify(t)} pattern=${JSON.stringify(p)}: every frame mapped to its own statement`, () => {
      const steps = kmp([], t, p)
      for (const s of steps) {
        const rule = KMP_RULES.find(([re]) => re.test(s.message))
        expect(rule, `no rule for "${s.message}"`).toBeTruthy()
        const got = shown('kmp', s)
        expect(got.text, `"${s.message}"`).toBe(rule![1])
        if (rule![2]) expect(got.ctx, `"${s.message}" condition`).toContain(rule![2])
      }
    })
  }

  it('the document branch for an empty pattern agrees with the trace result (hits [0])', () => {
    const [s] = kmp([], 'ABC', '')
    expect(s!.result).toMatchObject({ hits: [0] })
    expect(shown('kmp', s!).text).toBe('if (!pattern) return [0]')
  })

  it('variables and pointer labels use the reference code names of the running function', () => {
    const steps = kmp([], 'ABABCABABABD', 'ABABD')
    const doc = getCatalog('kmp')!.typescript.source
    for (const s of steps) {
      const vars = Object.keys(s.vars ?? {}).filter((k) => k !== 'phase' && k !== 'hit')
      for (const k of vars) expect(doc, `var ${k} of "${s.message}" appears in the code`).toMatch(new RegExp(`\\b${k}\\b`))
      const ptrs = s.arrayPointers ?? {}
      for (const [arr, m] of Object.entries(ptrs)) {
        for (const [name, idx] of Object.entries(m)) {
          // a pointer label names a variable of THIS frame and sits at that variable's value
          expect(s.vars?.[name], `"${s.message}" pointer ${arr}.${name} is a current variable`).toBe(idx)
        }
      }
    }
    // prefix phase: the pattern pointers are buildLps's i / len (there is no j there)
    const cmp = steps.find((s) => s.message.startsWith('比较 p['))!
    expect(Object.keys(cmp.arrayPointers!.pattern!).sort()).toEqual(['i', 'len'])
    // match phase: text.i / pattern.j and the vars are i / j (not ti / pj)
    const m = steps.find((s) => s.message.startsWith('比较 t['))!
    expect(Object.keys(m.vars!).sort()).toEqual(['i', 'j'])
    expect(m.arrayPointers).toEqual({ text: { i: m.vars!.i }, pattern: { j: m.vars!.j } })
  })
})

// ---------------------------------------------------------------- BFS
describe('V25 acceptance: BFS completion frame', () => {
  it('the final frame maps to the return statement instead of 未映射', () => {
    for (const steps of [bfs([]), bfs([], { 0: [1], 1: [0], 2: [] }, 0)]) {
      const last = steps.at(-1)!
      expect(last.message.startsWith('BFS 完成')).toBe(true)
      expect(shown('bfs', last).text).toBe('return { dist, parent }')
    }
  })
})

// ---------------------------------------------------------------- Floyd
describe('V25 acceptance: Floyd update frames', () => {
  it('"更新 d[i][j]" points at the assignment, with the comparison as condition', () => {
    const steps = floyd([])
    const upd = steps.filter((s) => s.message.startsWith('更新 d['))
    expect(upd.length).toBeGreaterThan(0)
    for (const s of upd) {
      const got = shown('floyd', s)
      expect(got.text, s.message).toBe('d[i]![j] = d[i]![k]! + d[k]![j]!')
      expect(got.ctx).toContain('if (d[i]![k]! + d[k]![j]! < d[i]![j]!) {')
    }
    // the check frames stay on the comparison
    for (const s of steps.filter((s) => s.message.startsWith('检查 d['))) {
      expect(shown('floyd', s).text).toBe('if (d[i]![k]! + d[k]![j]! < d[i]![j]!) {')
    }
  })
})
