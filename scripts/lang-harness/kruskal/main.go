package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	lines := strings.Split(strings.TrimSpace(string(b)), "\n")
	var n int
	fmt.Sscan(lines[0], &n)
	var edges []Edge
	for _, ln := range lines[1:] {
		var e Edge
		fmt.Sscan(ln, &e.U, &e.V, &e.W)
		edges = append(edges, e)
	}
	total, mst := kruskal(n, edges)
	fmt.Println(total)
	m := make([]string, len(mst))
	for k, e := range mst {
		m[k] = fmt.Sprintf("%d-%d:%d", e.U, e.V, e.W)
	}
	fmt.Println(strings.Join(m, " "))
}
