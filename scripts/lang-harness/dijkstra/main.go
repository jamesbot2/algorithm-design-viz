package main

import (
	"fmt"
	"io"
	"math"
	"os"
	"strconv"
	"strings"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	lines := strings.Split(strings.TrimSpace(string(b)), "\n")
	var n, start int
	fmt.Sscan(lines[0], &n, &start)
	adj := make([][]Arc, n)
	for _, ln := range lines[1:] {
		var u, v int
		var w float64
		fmt.Sscan(ln, &u, &v, &w)
		adj[u] = append(adj[u], Arc{V: v, W: w})
	}
	dist, parent := naiveDijkstra(n, start, adj)
	d := make([]string, n)
	p := make([]string, n)
	for i := 0; i < n; i++ {
		if math.IsInf(dist[i], 1) {
			d[i] = "INF"
		} else {
			d[i] = strconv.FormatInt(int64(dist[i]), 10)
		}
		p[i] = strconv.Itoa(parent[i])
	}
	fmt.Println(strings.Join(d, " "))
	fmt.Println(strings.Join(p, " "))
}
