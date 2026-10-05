package algorithms

import "sort"

// knapsackGreedyByDensity — 0-1 knapsack greedy by density (NOT optimal), complete Go reference.
func knapsackGreedyByDensity(weights, values []int, W int) (int, []int) {
	order := make([]int, len(weights))
	for i := range order {
		order[i] = i
	}
	density := func(i int) float64 { return float64(values[i]) / float64(weights[i]) }
	sort.SliceStable(order, func(a, b int) bool { return density(order[a]) > density(order[b]) }) // @a: sort
	rem := W
	value := 0
	selected := []int{}
	for _, i := range order {
		if weights[i] <= rem { // @a: check
			rem -= weights[i]
			value += values[i]
			selected = append(selected, i) // @a: pick
		}
	}
	return value, selected // @a: done
}
