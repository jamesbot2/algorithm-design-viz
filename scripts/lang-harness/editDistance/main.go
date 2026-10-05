package main

import (
	"fmt"
	"io"
	"os"
	"strings"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	p := append(strings.Split(string(b), "\n"), "", "")
	fmt.Println(editDistance(p[0], p[1]))
}
