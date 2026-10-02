/**
 * V26: six legacy code-line references reproduced in V25 acceptance (moved here from the
 * out-of-repo audit/open-defects.test.ts). Each expected statement is copied from the
 * CodeDocument shown in the code panel — the line a reader sees highlighted must be the
 * statement the frame reports as executed. Primary = highlighted exec line (anchor start);
 * a frame's remaining range lines / condition refs are the weak lines. No global offsets.
 */
import { describe, expect, it } from 'vitest'
import { getAlgo } from '../src/algorithms/registry'
import { getCatalog } from '../src/codeCatalog'
import { pickPrimaryCodeRef, weakContextRefs } from '../src/utils/codeRefs'
import { generateSteps as knapsack } from '../src/algorithms/knapsack01'
import { generateSteps as lcs } from '../src/algorithms/lcs'
import { generateSteps as floyd } from '../src/algorithms/floyd'
import type { Step } from '../src/types/step'

const steps = (id: string, input: unknown) => getAlgo(id)!.solve!(input).trace.steps as Step[]

/** What the code panel highlights for this frame (TypeScript tab). */
function shown(id: string, s: Step) {
  const doc = getCatalog(id)!.typescript
  const L = doc.source.split('\n')
  const p = pickPrimaryCodeRef(s)
  if (!p) return { line: 0, text: '未映射', weak: [] as string[] }
  expect(p.documentId, `${id}: ref document`).toBe(doc.documentId)
  const a = doc.anchors.find((x) => x.id === p.anchorId)
  expect(a, `${id}: anchor ${p.anchorId} exists in ${doc.documentId}`).toBeTruthy()
  const weak: string[] = []
  for (let n = a!.range.startLine + 1; n <= a!.range.endLine; n++) weak.push(L[n - 1]!.trim())
  for (const r of weakContextRefs(s)) {
    const c = doc.anchors.find((x) => x.id === r.anchorId)
    expect(c, `${id}: weak anchor ${r.anchorId} exists`).toBeTruthy()
    weak.push(L[c!.range.startLine - 1]!.trim())
  }
  return { line: a!.range.startLine, text: L[a!.range.startLine - 1]!.trim(), weak }
}

const ARRAYS = [[5, 2, 4, 1, 3], [2, 1], [3, 3, 3], [1], [9, 8, 7, 6, 5, 4, 3, 2]]

describe('V26 code-line offsets', () => {
  it('quickSort: "区间 [L,R] 无需划分" highlights the base case `if (L >= R) return`, not the partition call', () => {
    for (const arr of ARRAYS) {
      const f = steps('quickSort', { arr }).filter((s) => s.message.includes('无需划分'))
      expect(f.length, `arr=${arr}`).toBeGreaterThan(0)
      for (const s of f) expect(shown('quickSort', s).text, `arr=${arr} "${s.message}"`).toBe('if (L >= R) return')
    }
  })

  it('mergeSort: "归并区间 …（抽出 left/right 缓冲）" highlights the buffer slices (left, then right), not the compare', () => {
    for (const arr of ARRAYS.filter((a) => a.length > 1)) {
      const f = steps('mergeSort', { arr }).filter((s) => s.message.includes('抽出'))
      expect(f.length, `arr=${arr}`).toBeGreaterThan(0)
      for (const s of f) {
        const got = shown('mergeSort', s)
        expect(got.text, `arr=${arr} "${s.message}"`).toBe('const left = a.slice(L, mid + 1)')
        expect(got.weak, `arr=${arr} "${s.message}" right buffer`).toContain('const right = a.slice(mid + 1, R + 1)')
      }
    }
  })

  it('lcs: final "LCS 长度 = …" highlights the return; "开始回溯" highlights `let i = m` (with `let j = n`)', () => {
    for (const [x, y] of [[undefined, undefined], ['ABCBDAB', 'BDCABA'], ['AB', 'CD'], ['A', 'A']] as const) {
      const all = lcs([], x, y)
      const last = all.at(-1)!
      expect(last.message.startsWith('LCS 长度 =')).toBe(true)
      expect(shown('lcs', last).text, `X=${x} Y=${y} final`).toMatch(/^return \{ length: dp\[m\]!\[n\]!/)
      const start = all.find((s) => s.message.includes('开始回溯'))!
      const got = shown('lcs', start)
      expect(got.text, `X=${x} Y=${y} 开始回溯`).toBe('let i = m')
      expect(got.weak).toContain('let j = n')
    }
  })

  it('knapsack01: "选物品 … 更优：dp = take" highlights the write, not the take computation', () => {
    for (const [w, v, W] of [[undefined, undefined, undefined], [[1, 2], [5, 1], 3], [[3], [4], 5]] as const) {
      const all = knapsack([], w as number[] | undefined, v as number[] | undefined, W as number | undefined)
      const f = all.filter((s) => s.message.includes('更优'))
      expect(f.length).toBeGreaterThan(0)
      for (const s of f) expect(shown('knapsack01', s).text, s.message).toBe('if (take > dp[i]![w]!) dp[i]![w] = take')
      // the computation frame stays on the computation
      for (const s of all.filter((s) => s.message.startsWith('可选：take'))) {
        expect(shown('knapsack01', s).text).toBe('const take = dp[i - 1]![w - wt]! + val')
      }
    }
  })

  it('floyd: "初始化距离矩阵" highlights the copy of dist, not the k loop', () => {
    for (const m of [undefined, [[0, 1], [1, 0]], [[0, 5, Infinity], [Infinity, 0, 2], [1, Infinity, 0]]]) {
      const [s] = floyd([], m as number[][] | undefined)
      expect(s!.message.startsWith('初始化距离矩阵')).toBe(true)
      expect(shown('floyd', s!).text).toBe('const d = dist.map((r) => r.slice())')
    }
    // the k frames keep the k loop
    for (const s of floyd([]).filter((s) => s.message.startsWith('中转点 k'))) {
      expect(shown('floyd', s).text).toBe('for (let k = 0; k < n; k++) {')
    }
  })

  it('knapsack01 invalid-input frame is 未映射: the reference document has no validation statement (not dp init)', () => {
    // every guard of generateSteps; the page's own parser rejects all of these before solving
    for (const [w, v, W] of [
      [[0], [1], 3],
      [[1.5], [1], 3],
      [[1], [-1], 3],
      [[1], [1], 2.5],
      [[1], [1], -1],
      [[1, 2], [1], 3],
    ] as const) {
      const out = knapsack([], [...w], [...v], W)
      expect(out).toHaveLength(1)
      expect(out[0]!.phase).toBe('error')
      expect(shown('knapsack01', out[0]!).text, JSON.stringify({ w, v, W })).toBe('未映射')
      expect(out[0]!.codeLine, 'no numeric-line fallback either').toBeUndefined()
    }
  })
})
