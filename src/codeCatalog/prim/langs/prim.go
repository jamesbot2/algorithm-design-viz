package algorithms

import "math"

// Arc is an edge u–V with weight W (undirected: listed under both endpoints).
type Arc struct {
	V int
	W float64
}

// prim — Prim MST (dense O(V^2)), complete Go reference.
func prim(n int, adj [][]Arc, start int) (float64, []int) {
	INF := math.Inf(1)
	key := make([]float64, n)
	parent := make([]int, n)
	inMst := make([]bool, n)
	for i := range key {
		key[i], parent[i] = INF, -1
	}
	key[start] = 0 // @a: init
	for iter := 0; iter < n; iter++ {
		u := -1
		best := INF
		for i := 0; i < n; i++ {
			if !inMst[i] && key[i] < best { // @a: selectMin
				best = key[i]
				u = i
			}
		}
		if u < 0 {
			break
		}
		inMst[u] = true // @a: add
		for _, e := range adj[u] {
			if !inMst[e.V] && e.W < key[e.V] { // @a: relax
				key[e.V] = e.W // @a: update+1
				parent[e.V] = u
			}
		}
	}
	total := 0.0
	for i := 0; i < n; i++ {
		if parent[i] >= 0 {
			total += key[i]
		}
	}
	return total, parent // @a: done
}
