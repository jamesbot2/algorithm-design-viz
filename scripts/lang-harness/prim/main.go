package main

import (
	"fmt"
	"io"
	"os"
	"sort"
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
		adj[v] = append(adj[v], Arc{V: u, W: w})
	}
	total, parent := prim(n, adj, start)
	var es []string
	for i, p := range parent {
		if p >= 0 {
			es = append(es, fmt.Sprintf("%d-%d", min(p, i), max(p, i)))
		}
	}
	sort.Strings(es)
	fmt.Println(int64(total))
	fmt.Println(strings.Join(es, " "))
}
