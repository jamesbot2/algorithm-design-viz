package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func join(xs []int) string {
	s := make([]string, len(xs))
	for k, x := range xs {
		s[k] = fmt.Sprint(x)
	}
	return strings.Join(s, " ")
}

func main() {
	b, _ := io.ReadAll(os.Stdin)
	parts := strings.Split(string(b), "\n")
	for len(parts) < 2 {
		parts = append(parts, "")
	}
	fmt.Println(join(kmpSearch(parts[0], parts[1])))
	fmt.Println(join(buildLps(parts[1])))
}
