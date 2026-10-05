package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	parts := strings.Split(string(b), "\n")
	for len(parts) < 2 {
		parts = append(parts, "")
	}
	l, s := lcs(parts[0], parts[1])
	fmt.Printf("%d %s\n", l, s)
}
