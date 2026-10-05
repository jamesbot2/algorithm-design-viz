package algorithms

import "math"

// Arc is an outgoing edge u→V with weight W (adj[u] lists the arcs of u).
type Arc struct {
	V int
	W float64
}

// naiveDijkstra — naive Dijkstra (non-negative weights), complete Go reference.
func naiveDijkstra(n, start int, adj [][]Arc) ([]float64, []int) {
	INF := math.Inf(1)
	dist := make([]float64, n)
	done := make([]bool, n)
	parent := make([]int, n)
	for i := range dist {
		dist[i], parent[i] = INF, -1
	}
	dist[start] = 0 // @a: init
	for iter := 0; iter < n; iter++ {
		u := -1
		best := INF
		for i := 0; i < n; i++ {
			if !done[i] && dist[i] < best { // @a: selectMin
				best = dist[i]
				u = i
			}
		}
		if u < 0 || best == INF {
			break
		}
		done[u] = true
		for _, e := range adj[u] {
			if dist[u]+e.W < dist[e.V] { // @a: relax.condition
				dist[e.V] = dist[u] + e.W // @a: relax.update
				parent[e.V] = u
			}
		}
	}
	return dist, parent // @a: done, return
}
