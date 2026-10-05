/**
 * V28: reference cases for scripts/check-code-langs.ts. Every expected output is computed from the
 * APP's own solver (src/algorithms/*: the final step of generateSteps / the module's solve), never
 * from the reference documents themselves.
 */
import * as lcsAlgo from '../src/algorithms/lcs'
import * as kmpAlgo from '../src/algorithms/kmp'
import * as floydAlgo from '../src/algorithms/floyd'

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

export const CASES: Record<string, () => Case[]> = {
  lcs: lcsCases,
  kmp: kmpCases,
  floyd: floydCases,
}
