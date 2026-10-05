package algorithms

// knapsackDp2d — 0-1 knapsack DP 2D, complete Go reference. Returns (maxValue, selected).
func knapsackDp2d(weights, values []int, W int) (int, []int) {
	n := len(weights)
	dp := make([][]int, n+1) // @a: init+3
	for i := range dp {
		dp[i] = make([]int, W+1)
	}
	for i := 1; i <= n; i++ {
		wt := weights[i-1]
		val := values[i-1]
		for w := 0; w <= W; w++ {
			dp[i][w] = dp[i-1][w] // @a: fill
			if w >= wt {
				take := dp[i-1][w-wt] + val // @a: take
				if take > dp[i][w] { // @a: takeWrite+1
					dp[i][w] = take
				}
			}
		}
	}
	selected := []int{}
	w := W
	for i := n; i >= 1; i-- {
		if dp[i][w] != dp[i-1][w] {
			selected = append(selected, i-1) // @a: reconstruct
			w -= weights[i-1]
		}
	}
	for l, r := 0, len(selected)-1; l < r; l, r = l+1, r-1 {
		selected[l], selected[r] = selected[r], selected[l]
	}
	return dp[n][W], selected // @a: done, return
}
