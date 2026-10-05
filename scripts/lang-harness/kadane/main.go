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
	var a []int
	for _, f := range strings.Fields(string(b)) {
		x, _ := strconv.Atoi(f)
		a = append(a, x)
	}
	r := kadane(a)
	if r == nil {
		fmt.Println("null")
	} else {
		fmt.Println(r.best, r.start, r.end)
	}
}
