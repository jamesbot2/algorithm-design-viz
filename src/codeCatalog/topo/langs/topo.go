package main

// Kahn's topological sort. Returns [status, order...]: status 1 = acyclic (order has n nodes), 0 = cycle (order = nodes processed before it blocked).
func TopoSort(nn int64, edges []int64) []int64 {
	n := int(nn)
	adj := make([][]int, n)
	indeg := make([]int, n)
	for i := 0; i+1 < len(edges); i += 2 {
		adj[edges[i]] = append(adj[edges[i]], int(edges[i+1])) // @a: tsBuild+1
		indeg[edges[i+1]]++
	}
	queue := []int{}
	for v := 0; v < n; v++ { if indeg[v] == 0 { queue = append(queue, v) } } // @a: tsSeed
	order := []int64{}
	for head := 0; head < len(queue); head++ {
		u := queue[head] // @a: tsPop
		order = append(order, int64(u))
		for _, v := range adj[u] {
			indeg[v]-- // @a: tsRelax
			if indeg[v] == 0 { queue = append(queue, v) } // @a: tsEnqueue
		}
	}
	status := int64(0)
	if len(order) == n { status = 1 } // @a: tsResult
	return append([]int64{status}, order...)
}
