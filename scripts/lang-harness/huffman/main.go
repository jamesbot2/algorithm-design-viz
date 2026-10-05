package main

import (
	"fmt"
	"io"
	"os"
	"sort"
	"strconv"
	"strings"
)

var codes = map[string]string{}

func walk(n *HNode, p string, d int) int {
	if n.Left == nil && n.Right == nil {
		codes[n.Ch] = p
		return n.Freq * d
	}
	return walk(n.Left, p+"0", d+1) + walk(n.Right, p+"1", d+1)
}

func main() {
	b, _ := io.ReadAll(os.Stdin)
	l := strings.Split(string(b), "\n")
	sym := strings.Fields(l[0])
	var fr []int
	for _, f := range strings.Fields(l[1]) {
		x, _ := strconv.Atoi(f)
		fr = append(fr, x)
	}
	r := huffman(sym, fr)
	w := 0
	if r != nil {
		w = walk(r, "", 0)
	}
	fmt.Println(w)
	if strings.TrimSpace(l[2]) == "codes" {
		ks := make([]string, 0, len(codes))
		for k := range codes {
			ks = append(ks, k)
		}
		sort.Strings(ks)
		out := make([]string, len(ks))
		for i, k := range ks {
			out[i] = k + "=" + codes[k]
		}
		fmt.Println(strings.Join(out, " "))
	}
}
