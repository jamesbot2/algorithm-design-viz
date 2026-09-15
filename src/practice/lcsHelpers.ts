import { reconstructLcs } from '../algorithms/lcs'

export function buildLcsDp(X: string, Y: string): number[][] {
  const m = X.length
  const n = Y.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (X[i - 1] === Y[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]! + 1
      else dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
    }
  }
  return dp
}

export function lcsLengthAndOneString(X: string, Y: string): { length: number; one: string } {
  const dp = buildLcsDp(X, Y)
  return { length: dp[X.length]![Y.length]!, one: reconstructLcs(X, Y, dp) }
}

/** Enumerate all LCS strings of optimal length (small strings only). */
export function allLcsOfOptimalLength(X: string, Y: string, length: number): Set<string> {
  const out = new Set<string>()
  const m = X.length
  const n = Y.length
  const dp = buildLcsDp(X, Y)
  if (dp[m]![n] !== length) return out

  function dfs(i: number, j: number, acc: string[]) {
    if (out.size > 64) return // cap
    if (i === 0 || j === 0) {
      if (acc.length === length) out.add([...acc].reverse().join(''))
      return
    }
    if (X[i - 1] === Y[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      acc.push(X[i - 1]!)
      dfs(i - 1, j - 1, acc)
      acc.pop()
    } else {
      if (dp[i - 1]![j]! === dp[i]![j]) dfs(i - 1, j, acc)
      if (dp[i]![j - 1]! === dp[i]![j]) dfs(i, j - 1, acc)
    }
  }
  dfs(m, n, [])
  // Also ensure reconstruct path is present
  out.add(reconstructLcs(X, Y, dp))
  return out
}
