package algorithms

import "math"

// Arc is an outgoing edge u→V with weight W (adj[u] lists the arcs of u).
type Arc struct {
	V int
	W float64
}

// dijkstraHeap — Dijkstra with a hand-written binary heap of (u, d) and lazy deletion.
func dijkstraHeap(n, start int, adj [][]Arc) ([]float64, []int) {
	type item struct {
		u int
		d float64
	}
	INF := math.Inf(1)
	dist := make([]float64, n)
	parent := make([]int, n)
	for i := range dist {
		dist[i], parent[i] = INF, -1
	}
	dist[start] = 0 // @a: init
	heap := []item{{start, 0}}
	push := func(u int, d float64) {
		heap = append(heap, item{u, d})
		i := len(heap) - 1
		for i > 0 {
			p := (i - 1) >> 1
			if heap[p].d <= heap[i].d {
				break
			}
			heap[p], heap[i] = heap[i], heap[p]
			i = p
		}
	}
	pop := func() item {
		top := heap[0]
		last := heap[len(heap)-1]
		heap = heap[:len(heap)-1]
		if len(heap) > 0 {
			heap[0] = last
			i := 0
			for {
				l := i*2 + 1
				r := l + 1
				best := i
				if l < len(heap) && heap[l].d < heap[best].d {
					best = l
				}
				if r < len(heap) && heap[r].d < heap[best].d {
					best = r
				}
				if best == i {
					break
				}
				heap[i], heap[best] = heap[best], heap[i]
				i = best
			}
		}
		return top
	}
	for len(heap) > 0 {
		cur := pop() // @a: extract
		if cur.d != dist[cur.u] { // @a: stale+1
			continue
		}
		for _, e := range adj[cur.u] {
			if dist[cur.u]+e.W < dist[e.V] { // @a: relax
				dist[e.V] = dist[cur.u] + e.W
				parent[e.V] = cur.u
				push(e.V, dist[e.V])
			}
		}
	}
	return dist, parent // @a: done, return
}
