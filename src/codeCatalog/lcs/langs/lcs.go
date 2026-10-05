// LCS DP + reconstruct — complete Go reference.
package algorithms

import "slices"

// lcs returns the LCS length of X and Y and one longest common subsequence.
func lcs(X, Y string) (int, string) {
	m := len(X)
	n := len(Y)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}
	for i := 0; i <= m; i++ { // @a: init+5
		dp[i][0] = 0
	}
	for j := 0; j <= n; j++ {
		dp[0][j] = 0
	}
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if X[i-1] == Y[j-1] { // @a: compareChars
				dp[i][j] = dp[i-1][j-1] + 1 // @a: takeDiagonal, write, dpWrite
			} else {
				dp[i][j] = max(dp[i-1][j], dp[i][j-1]) // @a: dpFill
			}
		}
	}
	i := m // @a: reconstructStart+1
	j := n
	chars := []byte{}
	for i > 0 && j > 0 {
		if X[i-1] == Y[j-1] {
			chars = append(chars, X[i-1]) // @a: reconstruct
			i--
			j--
		} else if dp[i-1][j] >= dp[i][j-1] { // @a: reconstructMove, reconstructCompare
			i-- // @a: reconstructUp
		} else {
			j-- // @a: reconstructLeft
		}
	}
	slices.Reverse(chars)
	return dp[m][n], string(chars) // @a: done
}
