package algorithms

// knapsackBrute — 0-1 knapsack brute force, complete Go reference.
func knapsackBrute(weights, values []int, W int) int {
	n := len(weights)
	best := 0
	total := 1 << n
	for mask := 0; mask < total; mask++ { // @a: enum
		wt := 0
		val := 0
		for i := 0; i < n; i++ {
			if mask&(1<<i) != 0 {
				wt += weights[i] // @a: sum
				val += values[i]
			}
		}
		if wt <= W && val > best { // @a: feasible+1
			best = val
		}
	}
	return best // @a: done
}
