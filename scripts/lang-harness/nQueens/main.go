package main

import (
	"fmt"
	"strings"
)

func main() {
	var n int
	fmt.Scan(&n)
	s := solveNQueens(n)
	fmt.Println(len(s))
	for _, v := range s {
		p := make([]string, len(v))
		for k, x := range v {
			p[k] = fmt.Sprint(x)
		}
		fmt.Println(strings.Join(p, " "))
	}
}
