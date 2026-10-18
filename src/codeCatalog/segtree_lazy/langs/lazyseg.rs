// Lazy segment tree (range add + range sum), teaching version. 0-based, half-open [l, r).
pub struct LazySegTree {
    pub n: usize,
    pub total: Vec<i64>, // total[node] = sum of a[lo, hi) with tags at or above already applied
    pub lazy: Vec<i64>,  // lazy[node] = amount still to add to EACH element under node
}

impl LazySegTree {
    pub fn new(a: &[i64]) -> Self {
        let n = a.len();
        let mut t = LazySegTree { n, total: vec![0; 4 * n.max(1)], lazy: vec![0; 4 * n.max(1)] };
        if n > 0 {
            t.build(a, 1, 0, n); // @a: buildCall
        }
        t
    }

    fn build(&mut self, a: &[i64], node: usize, lo: usize, hi: usize) {
        if hi - lo == 1 { self.total[node] = a[lo]; return; } // @a: buildLeaf
        let mid = lo + (hi - lo) / 2;
        self.build(a, 2 * node, lo, mid);
        self.build(a, 2 * node + 1, mid, hi);
        self.total[node] = self.total[2 * node] + self.total[2 * node + 1]; // @a: buildPull
    }

    /// Put tag v on node: every element in [lo, hi) gains v.
    fn apply(&mut self, node: usize, lo: usize, hi: usize, v: i64) {
        self.total[node] += v * (hi - lo) as i64; // @a: applyTotal
        self.lazy[node] += v; // @a: applyTag
    }

    /// Hand the pending tag of node down to both children.
    fn push(&mut self, node: usize, lo: usize, hi: usize) {
        if self.lazy[node] == 0 { return; }
        let mid = lo + (hi - lo) / 2;
        let t = self.lazy[node];
        self.apply(2 * node, lo, mid, t); // @a: pushLeft
        self.apply(2 * node + 1, mid, hi, t); // @a: pushRight
        self.lazy[node] = 0; // @a: pushClear
    }

    /// a[i] += v for every i in [l, r).
    pub fn add(&mut self, l: usize, r: usize, v: i64) {
        let n = self.n;
        self.add_rec(1, 0, n, l, r, v); // @a: addCall
    }

    fn add_rec(&mut self, node: usize, lo: usize, hi: usize, l: usize, r: usize, v: i64) {
        if r <= lo || hi <= l { return; } // @a: addOutside
        if l <= lo && hi <= r { self.apply(node, lo, hi, v); return; } // @a: addInside
        self.push(node, lo, hi); // @a: addPush
        let mid = lo + (hi - lo) / 2;
        self.add_rec(2 * node, lo, mid, l, r, v); // @a: addSplit+1
        self.add_rec(2 * node + 1, mid, hi, l, r, v);
        self.total[node] = self.total[2 * node] + self.total[2 * node + 1]; // @a: addPull
    }

    /// Sum of a[l..r).
    pub fn sum(&mut self, l: usize, r: usize) -> i64 {
        let n = self.n;
        self.query(1, 0, n, l, r) // @a: sumCall
    }

    fn query(&mut self, node: usize, lo: usize, hi: usize, l: usize, r: usize) -> i64 {
        if r <= lo || hi <= l { return 0; } // @a: queryOutside
        if l <= lo && hi <= r { return self.total[node]; } // @a: queryInside
        self.push(node, lo, hi); // @a: queryPush
        let mid = lo + (hi - lo) / 2;
        self.query(2 * node, lo, mid, l, r) + self.query(2 * node + 1, mid, hi, l, r) // @a: querySplit
    }
}
