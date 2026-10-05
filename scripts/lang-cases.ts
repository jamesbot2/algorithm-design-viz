/**
 * V28: reference cases for scripts/check-code-langs.ts. Every expected output is computed from the
 * APP's own solver (src/algorithms/*: the final step of generateSteps / the module's solve), never
 * from the reference documents themselves.
 */
import * as lcsAlgo from '../src/algorithms/lcs'
import * as kmpAlgo from '../src/algorithms/kmp'
import * as floydAlgo from '../src/algorithms/floyd'
import * as bubbleAlgo from '../src/algorithms/bubbleSort'
import * as insertionAlgo from '../src/algorithms/insertionSort'
import * as mergeAlgo from '../src/algorithms/mergeSort'
import * as quickAlgo from '../src/algorithms/quickSort'
import * as binarySearchAlgo from '../src/algorithms/binarySearch'
import * as kadaneAlgo from '../src/algorithms/kadane'
import * as maxSubDcAlgo from '../src/algorithms/maxSubarrayDC'

export type Case = { name: string; stdin: string; expected: string }
const INF = Infinity

function lcsCases(): Case[] {
  const pairs: [string, string][] = [
    ['ABCBDAB', 'BDCABA'], ['AAA', 'AAA'], ['ABC', 'XYZ'], ['ABC', 'A'], ['A', 'ABC'], ['A', 'A'], ['A', 'B'],
    ['', 'AB'], ['AB', ''], ['', ''], ['AGGTAB', 'GXTXAYB'], ['XMJYAUZ', 'MZJAWXU'], ['ABCDEFGH', 'HGFEDCBA'],
  ]
  return pairs.map(([x, y]) => {
    const r = lcsAlgo.generateSteps([], x, y).at(-1)!.result as { length: number; lcs: string }
    return { name: `X="${x}" Y="${y}"`, stdin: `${x}\n${y}\n`, expected: `${r.length} ${r.lcs}`.trimEnd() }
  })
}

function kmpCases(): Case[] {
  const pairs: [string, string][] = [
    ['ABABCABABABD', 'ABABD'], ['AAAAA', 'AA'], ['ABCDEF', 'XYZ'], ['ABABABAB', 'ABAB'], ['abcabcabd', 'abcabd'],
    ['AABAACAADAABAABA', 'AABA'], ['A', 'A'], ['A', 'B'], ['ABC', ''], ['', 'A'], ['AAAA', 'AAAAA'],
  ]
  return pairs.map(([t, p]) => {
    const r = kmpAlgo.generateSteps([], t, p).at(-1)!.result as { hits: number[]; pi?: number[] }
    const lps = p ? (r.pi ?? []) : []
    return { name: `text="${t}" pattern="${p}"`, stdin: `${t}\n${p}\n`, expected: `${r.hits.join(' ')}\n${lps.join(' ')}`.trimEnd() }
  })
}

function floydCases(): Case[] {
  const mats: number[][][] = [
    floydAlgo.meta.defaultMatrix as number[][],
    [[0, 5, INF, 10], [INF, 0, 3, INF], [INF, INF, 0, 1], [INF, INF, INF, 0]],
    [[0, 1], [INF, 0]],
    [[0]],
    [[0, 4, INF], [INF, 0, -2], [3, INF, 0]],
    [[0, INF, INF], [INF, 0, INF], [INF, INF, 0]],
    [[0, 2, 9, INF, INF], [INF, 0, 6, 3, INF], [INF, INF, 0, INF, 1], [INF, 1, 2, 0, 7], [4, INF, INF, INF, 0]],
  ]
  return mats.map((m, k) => {
    const r = floydAlgo.generateSteps([], m).at(-1)!.result as { ok: boolean; matrix: (number | null)[][] }
    if (!r.ok) throw new Error(`floyd case ${k} has a negative cycle — not a reference case`)
    const fmt = (x: number) => (x === INF ? 'INF' : String(x))
    return {
      name: `matrix#${k} (n=${m.length})`,
      stdin: `${m.length}\n${m.map((row) => row.map(fmt).join(' ')).join('\n')}\n`,
      expected: r.matrix.map((row) => row.map((x) => (x === null ? 'INF' : String(x))).join(' ')).join('\n'),
    }
  })
}

const SORT_INPUTS: number[][] = [
  [5, 2, 8, 1, 9, 3, 7], [1], [2, 1], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [3, 3, 3], [4, -1, 0, -7, 4, 2, -1],
  [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], [0, 0, 1, 0], [42, 17, 42, 8, 17, 99, 1, 8],
]
type ArrStep = { arrays?: Record<string, unknown> }
/** sorting generators: expected = the array in the generator's FINAL frame (they carry no `result`) */
function sortCases(gen: (a: number[]) => ArrStep[]): () => Case[] {
  return () =>
    SORT_INPUTS.map((a) => {
      const fin = gen(a).at(-1)!.arrays?.a as number[]
      if (!Array.isArray(fin) || fin.length !== a.length) throw new Error(`sort generator final frame lacks arrays.a for ${a}`)
      return { name: `a=[${a}]`, stdin: `${a.join(' ')}\n`, expected: fin.join(' ') }
    })
}

function binarySearchCases(): Case[] {
  const qs: [number[], number][] = [
    [[1, 2, 3, 5, 7, 8, 9], 7], [[1, 2, 3, 5, 7, 8, 9], 1], [[1, 2, 3, 5, 7, 8, 9], 9], [[1, 2, 3, 5, 7, 8, 9], 4],
    [[1, 2, 2, 2, 3], 2], [[2, 2, 2, 2], 2], [[1, 3], 2], [[1], 1], [[1], 0], [[-5, -3, 0, 0, 0, 4], 0], [[1, 2, 3], 10],
  ]
  return qs.map(([a, t]) => {
    const r = binarySearchAlgo.generateSteps(a, t, 'requireSorted').at(-1)!.result as { foundIndex: number | null }
    if (!r) throw new Error(`binarySearch: no result for ${a} / ${t}`)
    return { name: `a=[${a}] target=${t}`, stdin: `${t}\n${a.join(' ')}\n`, expected: String(r.foundIndex ?? -1) }
  })
}

const KADANE_INPUTS: number[][] = [
  [-2, 1, -3, 4, -1, 2, 1, -5, 4], [1], [-3], [-3, -1, -2], [5, -9, 6], [2, 2, -1, 2], [0, 0, 0], [-1, 0, -1],
  [3, -2, 5, -1], [8, -19, 5, -4, 20], [1, 2, 3, 4],
]
function kadaneCases(): Case[] {
  const cs = KADANE_INPUTS.map((a) => {
    const r = kadaneAlgo.generateSteps(a).at(-1)!.result as { hasSubarray: boolean; best: number; range: [number, number] }
    if (!r?.hasSubarray) throw new Error(`kadane: no result for ${a}`)
    return { name: `a=[${a}]`, stdin: `${a.join(' ')}\n`, expected: `${r.best} ${r.range[0]} ${r.range[1]}` }
  })
  const e = kadaneAlgo.generateSteps([]).at(-1)!.result as { hasSubarray: boolean }
  if (e.hasSubarray !== false) throw new Error('kadane: empty input expected to give no subarray')
  return [...cs, { name: 'a=[] (no non-empty subarray)', stdin: '\n', expected: 'null' }]
}

function maxSubDcCases(): Case[] {
  return KADANE_INPUTS.map((a) => {
    const r = maxSubDcAlgo.generateSteps(a).at(-1)!.result as { best?: number; sum?: number; value?: number } | number
    const best = typeof r === 'number' ? r : (r.best ?? r.sum ?? r.value)
    if (typeof best !== 'number') throw new Error(`maxSubarrayDC: unexpected result ${JSON.stringify(r)}`)
    return { name: `a=[${a}]`, stdin: `${a.join(' ')}\n`, expected: String(best) }
  })
}

export const CASES: Record<string, () => Case[]> = {
  lcs: lcsCases,
  kmp: kmpCases,
  floyd: floydCases,
  bubbleSort: sortCases(bubbleAlgo.generateSteps as never),
  insertionSort: sortCases(insertionAlgo.generateSteps as never),
  mergeSort: sortCases(mergeAlgo.generateSteps as never),
  quickSort: sortCases(quickAlgo.generateSteps as never),
  binarySearch: binarySearchCases,
  kadane: kadaneCases,
  maxSubarrayDC: maxSubDcCases,
}
