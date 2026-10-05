package algorithms

import "sort"

// HNode is a Huffman tree node; leaves carry a symbol.
type HNode struct {
	Ch          string
	Freq        int
	Left, Right *HNode
}

// huffman — Huffman coding, complete Go reference.
func huffman(symbols []string, freqs []int) *HNode {
	nodes := make([]*HNode, len(symbols))
	for i, ch := range symbols { // @a: init+2
		nodes[i] = &HNode{Ch: ch, Freq: freqs[i]}
	}
	if len(nodes) == 0 {
		return nil
	}
	for len(nodes) > 1 {
		sort.SliceStable(nodes, func(i, j int) bool { return nodes[i].Freq < nodes[j].Freq }) // @a: sort
		a, b := nodes[0], nodes[1]
		nodes = nodes[2:]
		nodes = append(nodes, &HNode{Freq: a.Freq + b.Freq, Left: a, Right: b}) // @a: merge
	}
	return nodes[0] // @a: done
}
