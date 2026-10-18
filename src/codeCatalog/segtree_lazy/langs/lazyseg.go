package main

// Lazy segment tree (range add + range sum), teaching version. 0-based, half-open [l, r).
type LazySegTree struct {
	n     int
	total []int64 // total[node] = sum of a[lo, hi) with tags at or above already applied
	lazy  []int64 // lazy[node] = amount still to add to EACH element under node
}

func NewLazySegTree(a []int64) *LazySegTree {
	n := len(a)
	size := n
	if size < 1 {
		size = 1
	}
	t := &LazySegTree{n: n, total: make([]int64, 4*size), lazy: make([]int64, 4*size)}
	if n > 0 {
		t.build(a, 1, 0, n) // @a: buildCall
	}
	return t
}

func (t *LazySegTree) build(a []int64, node, lo, hi int) {
	if hi-lo == 1 { t.total[node] = a[lo]; return } // @a: buildLeaf
	mid := lo + (hi-lo)/2
	t.build(a, 2*node, lo, mid)
	t.build(a, 2*node+1, mid, hi)
	t.total[node] = t.total[2*node] + t.total[2*node+1] // @a: buildPull
}

// apply puts tag v on node: every element in [lo, hi) gains v.
func (t *LazySegTree) apply(node, lo, hi int, v int64) {
	t.total[node] += v * int64(hi-lo) // @a: applyTotal
	t.lazy[node] += v // @a: applyTag
}

// push hands the pending tag of node down to both children.
func (t *LazySegTree) push(node, lo, hi int) {
	if t.lazy[node] == 0 {
		return
	}
	mid := lo + (hi-lo)/2
	t.apply(2*node, lo, mid, t.lazy[node]) // @a: pushLeft
	t.apply(2*node+1, mid, hi, t.lazy[node]) // @a: pushRight
	t.lazy[node] = 0 // @a: pushClear
}

// Add does a[i] += v for every i in [l, r).
func (t *LazySegTree) Add(l, r int, v int64) {
	t.addRec(1, 0, t.n, l, r, v) // @a: addCall
}

func (t *LazySegTree) addRec(node, lo, hi, l, r int, v int64) {
	if r <= lo || hi <= l { return } // @a: addOutside
	if l <= lo && hi <= r { t.apply(node, lo, hi, v); return } // @a: addInside
	t.push(node, lo, hi) // @a: addPush
	mid := lo + (hi-lo)/2
	t.addRec(2*node, lo, mid, l, r, v) // @a: addSplit+1
	t.addRec(2*node+1, mid, hi, l, r, v)
	t.total[node] = t.total[2*node] + t.total[2*node+1] // @a: addPull
}

// Sum returns the sum of a[l..r).
func (t *LazySegTree) Sum(l, r int) int64 {
	return t.query(1, 0, t.n, l, r) // @a: sumCall
}

func (t *LazySegTree) query(node, lo, hi, l, r int) int64 {
	if r <= lo || hi <= l { return 0 } // @a: queryOutside
	if l <= lo && hi <= r { return t.total[node] } // @a: queryInside
	t.push(node, lo, hi) // @a: queryPush
	mid := lo + (hi-lo)/2
	return t.query(2*node, lo, mid, l, r) + t.query(2*node+1, mid, hi, l, r) // @a: querySplit
}
