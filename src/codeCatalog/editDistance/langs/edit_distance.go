package algorithms

// editDistance — Levenshtein distance, complete Go reference.
func editDistance(a, b string) int {
	ra, rb := []rune(a), []rune(b)
	m := len(ra)
	n := len(rb)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}
	for i := 0; i <= m; i++ { // @a: init+2
		dp[i][0] = i
	}
	for j := 0; j <= n; j++ {
		dp[0][j] = j
	}
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if ra[i-1] == rb[j-1] { // @a: equal+1
				dp[i][j] = dp[i-1][j-1]
			} else {
				dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) // @a: replace
			}
		}
	}
	return dp[m][n] // @a: done, return
}
