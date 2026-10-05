package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

func ints(s string) []int {
	var r []int
	for _, f := range strings.Fields(s) {
		x, _ := strconv.Atoi(f)
		r = append(r, x)
	}
	return r
}

func main() {
	b, _ := io.ReadAll(os.Stdin)
	l := strings.Split(string(b), "\n")
	W, _ := strconv.Atoi(strings.TrimSpace(l[0]))
	fmt.Println(knapsackBrute(ints(l[1]), ints(l[2]), W))
}
