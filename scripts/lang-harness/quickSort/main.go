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
	r := quickSort(a)
	s := make([]string, len(r))
	for k, x := range r {
		s[k] = fmt.Sprint(x)
	}
	fmt.Println(strings.Join(s, " "))
}
