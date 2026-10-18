package main

// LCA by binary lifting. par[v-1] = parent of node v (1..n-1), must satisfy par[v-1] < v; node 0 is the root. queries = flat pairs (u v).
func LcaAll(par []int64, queries []int64) []int64 {
	n := len(par) + 1
	log := 1
	for (1 << log) < n {
		log++
	}
	depth := make([]int, n)
	for v := 1; v < n; v++ { depth[v] = depth[par[v-1]] + 1 } // @a: lcaDepth
	up := make([][]int, log)
	for j := range up { up[j] = make([]int, n) }
	for v := 1; v < n; v++ { up[0][v] = int(par[v-1]) } // @a: lcaBase
	for j := 1; j < log; j++ { for v := 0; v < n; v++ { up[j][v] = up[j-1][up[j-1][v]] } } // @a: lcaTable
	out := []int64{}
	for q := 0; q+1 < len(queries); q += 2 {
		u, v := int(queries[q]), int(queries[q+1])
		if depth[u] < depth[v] { u, v = v, u }
		diff := depth[u] - depth[v]
		for j := 0; j < log; j++ {
			if (diff>>j)&1 == 1 { u = up[j][u] } // @a: lcaLift
		}
		if u != v {
			for j := log - 1; j >= 0; j-- {
				if up[j][u] != up[j][v] { u = up[j][u]; v = up[j][v] } // @a: lcaJump
			}
			u = up[0][u] // @a: lcaParent
		}
		out = append(out, int64(u)) // @a: lcaAnswer
	}
	return out
}
