package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

func paren(s [][]int, i, j int) string {
	if i == j {
		return fmt.Sprintf("A%d", i+1)
	}
	return "(" + paren(s, i, s[i][j]) + paren(s, s[i][j]+1, j) + ")"
}

func main() {
	b, _ := io.ReadAll(os.Stdin)
	var d []int
	for _, f := range strings.Fields(string(b)) {
		x, _ := strconv.Atoi(f)
		d = append(d, x)
	}
	c, s := matrixChainOrder(d)
	fmt.Println(c)
	fmt.Println(paren(s, 0, len(d)-2))
}
