package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	tok := strings.Fields(string(b))
	n, _ := strconv.Atoi(tok[0])
	g := make([][]float64, n)
	for i := range g {
		g[i] = make([]float64, n)
		for j := range g[i] {
			t := tok[1+i*n+j]
			if t == "INF" {
				g[i][j] = INF
			} else {
				g[i][j], _ = strconv.ParseFloat(t, 64)
			}
		}
	}
	for _, row := range floyd(g) {
		s := make([]string, n)
		for j, x := range row {
			if x == INF {
				s[j] = "INF"
			} else {
				s[j] = strconv.FormatInt(int64(x), 10)
			}
		}
		fmt.Println(strings.Join(s, " "))
	}
}
