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
	l := strings.Split(string(b), "\n")
	st, en := strings.Fields(l[0]), strings.Fields(l[1])
	acts := make([]Activity, len(st))
	for i := range st {
		s, _ := strconv.ParseFloat(st[i], 64)
		e, _ := strconv.ParseFloat(en[i], 64)
		acts[i] = Activity{ID: fmt.Sprintf("A%d", i), Start: s, Finish: e}
	}
	fmt.Println(strings.Join(activitySelection(acts), " "))
}
