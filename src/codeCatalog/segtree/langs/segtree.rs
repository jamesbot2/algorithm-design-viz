// Segment tree (point assign + range sum), teaching version. 0-based, half-open [l, r).
pub struct SegTree {
    pub n: usize,
    pub tree: Vec<i64>, // tree[node] = sum of a[lo, hi); node 1 is the root
}

impl SegTree {
    pub fn new(a: &[i64]) -> Self {
        let n = a.len();
        let mut t = SegTree { n, tree: vec![0; 4 * n.max(1)] };
        if n > 0 {
            t.build(a, 1, 0, n); // @a: buildCall
        }
        t
    }

    fn build(&mut self, a: &[i64], node: usize, lo: usize, hi: usize) {
        if hi - lo == 1 {
            self.tree[node] = a[lo]; // @a: buildLeaf
            return;
        }
        let mid = lo + (hi - lo) / 2;
        self.build(a, 2 * node, lo, mid);
        self.build(a, 2 * node + 1, mid, hi);
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]; // @a: buildPull
    }

    /// a[i] = v
    pub fn set(&mut self, i: usize, v: i64) {
        let n = self.n;
        self.set_rec(1, 0, n, i, v); // @a: setCall
    }

    fn set_rec(&mut self, node: usize, lo: usize, hi: usize, i: usize, v: i64) {
        if hi - lo == 1 {
            self.tree[node] = v; // @a: setLeaf
            return;
        }
        let mid = lo + (hi - lo) / 2;
        if i < mid { self.set_rec(2 * node, lo, mid, i, v) } // @a: setDescend+1
        else { self.set_rec(2 * node + 1, mid, hi, i, v) }
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]; // @a: setPull
    }

    /// Sum of a[l..r).
    pub fn sum(&self, l: usize, r: usize) -> i64 {
        self.query(1, 0, self.n, l, r) // @a: sumCall
    }

    fn query(&self, node: usize, lo: usize, hi: usize, l: usize, r: usize) -> i64 {
        if r <= lo || hi <= l { return 0; } // @a: queryOutside
        if l <= lo && hi <= r { return self.tree[node]; } // @a: queryInside
        let mid = lo + (hi - lo) / 2;
        self.query(2 * node, lo, mid, l, r) + self.query(2 * node + 1, mid, hi, l, r) // @a: querySplit
    }
}
