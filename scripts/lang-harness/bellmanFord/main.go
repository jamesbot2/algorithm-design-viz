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
	var mode string
	fmt.Sscan(lines[0], &n, &start, &mode)
	var edges []Edge
	for _, ln := range lines[1:] {
		var e Edge
		fmt.Sscan(ln, &e.U, &e.V, &e.W)
		edges = append(edges, e)
	}
	dist, parent, neg := bellmanFord(n, edges, start)
	if mode == "full" {
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
	fmt.Println(neg)
}
