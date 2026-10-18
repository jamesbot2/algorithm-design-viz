package main

// Segment tree (point assign + range sum), teaching version. 0-based, half-open [l, r).
type SegTree struct {
	n    int
	tree []int64 // tree[node] = sum of a[lo, hi); node 1 is the root
}

func NewSegTree(a []int64) *SegTree {
	n := len(a)
	size := n
	if size < 1 {
		size = 1
	}
	t := &SegTree{n: n, tree: make([]int64, 4*size)}
	if n > 0 {
		t.build(a, 1, 0, n) // @a: buildCall
	}
	return t
}

func (t *SegTree) build(a []int64, node, lo, hi int) {
	if hi-lo == 1 {
		t.tree[node] = a[lo] // @a: buildLeaf
		return
	}
	mid := lo + (hi-lo)/2
	t.build(a, 2*node, lo, mid)
	t.build(a, 2*node+1, mid, hi)
	t.tree[node] = t.tree[2*node] + t.tree[2*node+1] // @a: buildPull
}

// Set does a[i] = v.
func (t *SegTree) Set(i int, v int64) {
	t.setRec(1, 0, t.n, i, v) // @a: setCall
}

func (t *SegTree) setRec(node, lo, hi, i int, v int64) {
	if hi-lo == 1 {
		t.tree[node] = v // @a: setLeaf
		return
	}
	mid := lo + (hi-lo)/2
	if i < mid { // @a: setDescend+3
		t.setRec(2*node, lo, mid, i, v)
	} else {
		t.setRec(2*node+1, mid, hi, i, v)
	}
	t.tree[node] = t.tree[2*node] + t.tree[2*node+1] // @a: setPull
}

// Sum returns a[l..r).
func (t *SegTree) Sum(l, r int) int64 {
	return t.query(1, 0, t.n, l, r) // @a: sumCall
}

func (t *SegTree) query(node, lo, hi, l, r int) int64 {
	if r <= lo || hi <= l { // @a: queryOutside
		return 0
	}
	if l <= lo && hi <= r { // @a: queryInside
		return t.tree[node]
	}
	mid := lo + (hi-lo)/2
	return t.query(2*node, lo, mid, l, r) + t.query(2*node+1, mid, hi, l, r) // @a: querySplit
}
