package algorithms

import "math"

// Edge is a directed weighted edge U→V.
type Edge struct {
	U, V int
	W    float64
}

// bellmanFord — Bellman-Ford, complete Go reference. Returns (dist, parent, negCycle).
func bellmanFord(n int, edges []Edge, start int) ([]float64, []int, bool) {
	INF := math.Inf(1)
	dist := make([]float64, n)
	parent := make([]int, n)
	for i := range dist {
		dist[i], parent[i] = INF, -1
	}
	dist[start] = 0 // @a: init
	for i := 0; i < n-1; i++ { // @a: round
		for _, e := range edges {
			if dist[e.U]+e.W < dist[e.V] { // @a: relax
				dist[e.V] = dist[e.U] + e.W // @a: update
				parent[e.V] = e.U
			}
		}
	}
	negCycle := false
	for _, e := range edges {
		if dist[e.U]+e.W < dist[e.V] {
			negCycle = true // @a: negCycle
			break
		}
	}
	return dist, parent, negCycle // @a: done
}
