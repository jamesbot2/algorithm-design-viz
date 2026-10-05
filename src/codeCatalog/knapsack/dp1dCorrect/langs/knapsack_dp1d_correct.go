package algorithms

// knapsackDp1dCorrect — 0-1 knapsack 1D correct (reverse), complete Go reference.
func knapsackDp1dCorrect(weights, values []int, W int) int {
	dp := make([]int, W+1) // @a: init
	for i := 0; i < len(weights); i++ {
		wt := weights[i]
		val := values[i]
		for w := W; w >= wt; w-- { // @a: reverse
			dp[w] = max(dp[w], dp[w-wt]+val) // @a: update
		}
	}
	return dp[W] // @a: done
}
