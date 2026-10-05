package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

func join(xs []int) string {
	s := make([]string, len(xs))
	for k, x := range xs {
		s[k] = strconv.Itoa(x)
	}
	return strings.Join(s, " ")
}

func main() {
	b, _ := io.ReadAll(os.Stdin)
	lines := strings.Split(string(b), "\n")
	var n, start int
	fmt.Sscan(lines[0], &n, &start)
	adj := make([][]int, n)
	for i := 0; i < n; i++ {
		for _, f := range strings.Fields(lines[1+i]) {
			v, _ := strconv.Atoi(f)
			adj[i] = append(adj[i], v)
		}
	}
	dist, parent := bfs(adj, start)
	fmt.Println(join(dist))
	fmt.Println(join(parent))
}
