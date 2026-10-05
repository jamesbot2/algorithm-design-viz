package algorithms

import "sort"

// knapsackBranchAndBound — 0-1 knapsack branch-and-bound (density bound), complete Go reference.
func knapsackBranchAndBound(weights, values []int, W int) int {
	n := len(weights)
	order := make([]int, n)
	for i := range order {
		order[i] = i
	}
	density := func(i int) float64 { return float64(values[i]) / float64(weights[i]) }
	sort.SliceStable(order, func(a, b int) bool { return density(order[a]) > density(order[b]) })
	best := 0
	bound := func(i, remW, cur int) float64 { // @a: bound
		b := float64(cur)
		w := remW
		for k := i; k < n; k++ {
			idx := order[k]
			if weights[idx] <= w {
				w -= weights[idx]
				b += float64(values[idx])
			} else {
				b += density(idx) * float64(w)
				break
			}
		}
		return b
	}
	var dfs func(i, remW, cur int)
	dfs = func(i, remW, cur int) {
		if i == n {
			if cur > best {
				best = cur
			}
			return
		}
		if bound(i, remW, cur) <= float64(best) { // @a: prune+1
			return
		}
		idx := order[i]
		if weights[idx] <= remW { // @a: take+1
			dfs(i+1, remW-weights[idx], cur+values[idx])
		}
		dfs(i+1, remW, cur) // @a: skip
	}
	dfs(0, W, 0)
	return best
}
