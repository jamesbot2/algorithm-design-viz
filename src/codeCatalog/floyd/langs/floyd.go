// Floyd-Warshall — complete Go reference.
package algorithms

import "math"

// INF marks a missing edge.
var INF = math.Inf(1)

// floyd returns the all-pairs shortest-path matrix for dist (INF = no edge).
func floyd(dist [][]float64) [][]float64 {
	n := len(dist)
	d := make([][]float64, n) // @a: init+3
	for r := range dist {
		d[r] = append([]float64(nil), dist[r]...)
	}
	for k := 0; k < n; k++ { // @a: kLoop
		for i := 0; i < n; i++ {
			for j := 0; j < n; j++ {
				if d[i][k]+d[k][j] < d[i][j] { // @a: relax
					d[i][j] = d[i][k] + d[k][j] // @a: update
				}
			}
		}
	}
	return d // @a: done
}
