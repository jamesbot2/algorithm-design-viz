package algorithms

import "sort"

// Edge is an undirected weighted edge.
type Edge struct{ U, V, W int }

// kruskal — Kruskal MST with union-find (path compression), complete Go reference.
func kruskal(n int, edges []Edge) (int, []Edge) {
	parent := make([]int, n)
	for i := range parent {
		parent[i] = i
	}
	var find func(x int) int
	find = func(x int) int {
		if parent[x] != x {
			parent[x] = find(parent[x])
		}
		return parent[x]
	}
	sorted := append([]Edge(nil), edges...)
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].W < sorted[j].W }) // @a: sort
	mst := []Edge{}
	total := 0
	for _, e := range sorted {
		a := find(e.U) // @a: find
		b := find(e.V)
		if a == b { // @a: skip+1
			continue
		}
		parent[a] = b // @a: union
		mst = append(mst, e)
		total += e.W
		if len(mst) == n-1 {
			break
		}
	}
	return total, mst // @a: done
}
