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
	var v []int
	for _, f := range strings.Fields(string(b)) {
		x, _ := strconv.Atoi(f)
		v = append(v, x)
	}
	fmt.Println(binarySearch(v[1:], v[0]))
}
