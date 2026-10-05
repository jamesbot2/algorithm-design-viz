package algorithms

import "math"

// matrixChainOrder — matrix-chain order DP, complete Go reference. Returns (cost, split).
func matrixChainOrder(dims []int) (int, [][]int) {
	n := len(dims) - 1
	dp := make([][]int, n) // @a: init+1
	split := make([][]int, n)
	for i := range dp {
		dp[i], split[i] = make([]int, n), make([]int, n)
	}
	for length := 2; length <= n; length++ { // @a: lenLoop
		for i := 0; i <= n-length; i++ {
			j := i + length - 1
			dp[i][j] = math.MaxInt
			for k := i; k < j; k++ { // @a: trySplit
				cost := dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1] // @a: cost
				if cost < dp[i][j] { // @a: update
					dp[i][j] = cost
					split[i][j] = k
				}
			}
		}
	}
	return dp[0][n-1], split // @a: done
}
