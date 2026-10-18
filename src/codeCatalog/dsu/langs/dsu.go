package main

// DSU: union by size + path compression (teaching version). Elements are 0..n-1.
type DSU struct {
	parent, size []int
	count        int // number of disjoint sets
}

func NewDSU(n int) *DSU {
	d := &DSU{parent: make([]int, n), size: make([]int, n), count: n}
	for i := range d.parent { // @a: init+3
		d.parent[i] = i
		d.size[i] = 1
	}
	return d
}

// Find returns the root of x; afterwards every node on the path points directly at the root.
func (d *DSU) Find(x int) int {
	root := x // @a: findStart
	for d.parent[root] != root { // @a: findClimb+2
		root = d.parent[root]
	}
	for d.parent[x] != root { // @a: compress+4
		next := d.parent[x]
		d.parent[x] = root
		x = next
	}
	return root // @a: findReturn
}

// Union merges the sets of a and b. It returns true if they were different sets.
func (d *DSU) Union(a, b int) bool {
	ra, rb := d.Find(a), d.Find(b) // @a: unionFind
	if ra == rb { // @a: unionSame+2
		return false
	}
	if d.size[ra] < d.size[rb] { // @a: unionSwap+2
		ra, rb = rb, ra
	}
	d.parent[rb] = ra // @a: unionLink+2
	d.size[ra] += d.size[rb]
	d.count--
	return true // @a: unionDone
}

func (d *DSU) Same(a, b int) bool {
	return d.Find(a) == d.Find(b) // @a: sameCompare
}
