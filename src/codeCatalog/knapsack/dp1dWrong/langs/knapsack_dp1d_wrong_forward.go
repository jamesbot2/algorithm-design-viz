package algorithms

// knapsackDp1dWrongForward — 0-1 knapsack 1D WRONG forward update (counterexample), complete Go reference.
func knapsackDp1dWrongForward(weights, values []int, W int) int {
	dp := make([]int, W+1) // @a: init
	for i := 0; i < len(weights); i++ {
		wt := weights[i]
		val := values[i]
		for w := wt; w <= W; w++ { // @a: forward
			dp[w] = max(dp[w], dp[w-wt]+val) // @a: update
		}
	}
	return dp[W] // @a: done
}
