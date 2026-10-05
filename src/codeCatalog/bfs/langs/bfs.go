package algorithms

// bfs — BFS shortest path on an unweighted graph, complete Go reference.
func bfs(adj [][]int, start int) ([]int, []int) {
	n := len(adj)
	dist := make([]int, n)
	parent := make([]int, n)
	for i := range dist {
		dist[i], parent[i] = -1, -1
	}
	q := []int{start} // @a: init
	dist[start] = 0
	head := 0
	for head < len(q) {
		u := q[head] // @a: dequeue+1
		head++
		for _, v := range adj[u] {
			if dist[v] < 0 { // @a: visit
				dist[v] = dist[u] + 1
				parent[v] = u
				q = append(q, v) // @a: enqueue
			}
		}
	}
	return dist, parent // @a: done
}
