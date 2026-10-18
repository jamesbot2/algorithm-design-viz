package main

// Fenwick tree (binary indexed tree), teaching version.
// Public API: 0-based indices, half-open ranges [l, r). Internally tree is 1-based.
type Fenwick struct {
	n    int
	tree []int64 // tree[0] is unused
}

func NewFenwick(n int) *Fenwick {
	return &Fenwick{n: n, tree: make([]int64, n+1)} // @a: init
}

// Add does a[i] += delta (i is 0-based).
func (f *Fenwick) Add(i int, delta int64) {
	p := i + 1 // @a: addStart
	for p <= f.n {
		f.tree[p] += delta // @a: addApply
		p += p & -p // @a: addNext
	}
}

// Prefix returns the sum of a[0..r).
func (f *Fenwick) Prefix(r int) int64 {
	var sum int64 // @a: prefixStart+1
	p := r
	for p > 0 {
		sum += f.tree[p] // @a: prefixAccum
		p -= p & -p // @a: prefixNext
	}
	return sum // @a: prefixReturn
}

// Range returns the sum of a[l..r).
func (f *Fenwick) Range(l, r int) int64 {
	return f.Prefix(r) - f.Prefix(l) // @a: rangeCompute
}
