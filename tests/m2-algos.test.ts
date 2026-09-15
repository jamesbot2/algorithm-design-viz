import { describe, expect, it } from 'vitest'
import { solveNQueens } from '../src/algorithms/nQueens'
import { solveMatrixChain } from '../src/algorithms/matrixChain'
import { solveHuffman } from '../src/algorithms/huffman'
import { solveMaxSubarrayDC, maxSubarrayBrute } from '../src/algorithms/maxSubarrayDC'
import { reconstructLcs } from '../src/algorithms/lcs'
import { reconstructEditOps } from '../src/algorithms/editDistance'
import * as lcs from '../src/algorithms/lcs'
import * as editDistance from '../src/algorithms/editDistance'
import * as kadane from '../src/algorithms/kadane'

describe('M2 nQueens', () => {
  it('n=1 → 1, n=2/3 → 0, n=4 → 2', () => {
    expect(solveNQueens(1, 'all').result.solutionCount).toBe(1)
    expect(solveNQueens(2, 'all').result.solutionCount).toBe(0)
    expect(solveNQueens(3, 'all').result.solutionCount).toBe(0)
    expect(solveNQueens(4, 'all').result.solutionCount).toBe(2)
  })

  it('n=8 full enum = 92 with high budget', () => {
    const { result } = solveNQueens(8, 'all', { maxNodes: 2_000_000, maxSolutions: 100 })
    expect(result.complete).toBe(true)
    expect(result.solutionCount).toBe(92)
  })

  it('budget cut does not claim complete', () => {
    const { result } = solveNQueens(8, 'all', { maxNodes: 50, maxSolutions: 1 })
    if (result.truncated) {
      expect(result.complete).toBe(false)
    }
  })
})

describe('M2 matrixChain', () => {
  it('dims [10,30,5,60] → 4500', () => {
    const { result } = solveMatrixChain([10, 30, 5, 60])
    expect(result.minCost).toBe(4500)
    expect(result.parenthesization.length).toBeGreaterThan(0)
  })
})

describe('M2 huffman', () => {
  it('WPL sanity + empty/single conventions + deterministic ties', () => {
    expect(solveHuffman([], []).result.wpl).toBe(0)
    expect(solveHuffman(['a'], [1]).result).toMatchObject({ wpl: 0, codes: { a: '' } })
    const { result } = solveHuffman(['a', 'b', 'c'], [1, 1, 1])
    expect(result.ok).toBe(true)
    expect(result.wpl).toBeGreaterThan(0)
    // deterministic: same input → same codes
    const again = solveHuffman(['a', 'b', 'c'], [1, 1, 1]).result
    expect(again.codes).toEqual(result.codes)
  })
})

describe('M2 max subarray', () => {
  it('example → 6; DC matches brute and kadane', () => {
    const a = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
    const dc = solveMaxSubarrayDC(a).result
    const brute = maxSubarrayBrute(a)
    expect(dc.best).toBe(6)
    expect(brute.best).toBe(6)
    const kadaneSteps = kadane.generateSteps(a)
    const kRes = kadaneSteps[kadaneSteps.length - 1]?.result as { best: number }
    expect(kRes.best).toBe(6)
  })
})

describe('M2 LCS / editDistance reconstruction', () => {
  it('LCS string is subsequence of both and length matches dp', () => {
    const X = 'ABCBDAB'
    const Y = 'BDCABA'
    const steps = lcs.generateSteps([], X, Y)
    const res = steps[steps.length - 1]?.result as { length: number; lcs: string }
    expect(res.length).toBe(res.lcs.length)
    // is subsequence
    const isSub = (s: string, t: string) => {
      let i = 0
      for (const ch of t) {
        if (i < s.length && s[i] === ch) i++
      }
      return i === s.length
    }
    expect(isSub(res.lcs, X)).toBe(true)
    expect(isSub(res.lcs, Y)).toBe(true)
    // matrixTargets path present
    expect(steps[steps.length - 1]?.matrixTargets?.dp?.path?.length).toBeGreaterThan(0)
  })

  it('edit ops transform A to B with distance match', () => {
    const A = 'kitten'
    const B = 'sitting'
    const steps = editDistance.generateSteps([], A, B)
    const res = steps[steps.length - 1]?.result as {
      distance: number
      ops: { op: string }[]
    }
    expect(res.distance).toBe(3)
    const edits = res.ops.filter((o) => o.op !== 'match').length
    expect(edits).toBe(res.distance)
    expect(steps[steps.length - 1]?.matrixTargets?.dp?.path?.length).toBeGreaterThan(0)
    // reconstruct helper available
    const dp: number[][] = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0))
    for (let i = 0; i <= A.length; i++) dp[i]![0] = i
    for (let j = 0; j <= B.length; j++) dp[0]![j] = j
    for (let i = 1; i <= A.length; i++) {
      for (let j = 1; j <= B.length; j++) {
        if (A[i - 1] === B[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]!
        else dp[i]![j] = 1 + Math.min(dp[i]![j - 1]!, dp[i - 1]![j]!, dp[i - 1]![j - 1]!)
      }
    }
    expect(reconstructEditOps(A, B, dp).filter((o) => o.op !== 'match').length).toBe(3)
    expect(reconstructLcs(X, Y, (() => {
      const m = X.length, n = Y.length
      const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
      for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
          d[i]![j] = X[i - 1] === Y[j - 1] ? d[i - 1]![j - 1]! + 1 : Math.max(d[i - 1]![j]!, d[i]![j - 1]!)
      return d
    })()).length).toBeGreaterThan(0)
  })
})

const X = 'ABCBDAB'
const Y = 'BDCABA'
