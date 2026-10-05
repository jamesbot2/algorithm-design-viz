package algorithms

// knapsackBacktracking — 0-1 knapsack backtracking, complete Go reference.
func knapsackBacktracking(weights, values []int, W int) int {
	best := 0
	var dfs func(i, remW, cur int)
	dfs = func(i, remW, cur int) { // @a: call
		if i == len(weights) {
			if cur > best { // @a: best+1
				best = cur
			}
			return
		}
		dfs(i+1, remW, cur) // @a: skip
		if weights[i] <= remW {
			dfs(i+1, remW-weights[i], cur+values[i]) // @a: take
		}
	}
	dfs(0, W, 0)
	return best
}
