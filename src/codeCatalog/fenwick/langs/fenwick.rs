/// Fenwick tree (binary indexed tree), teaching version.
/// Public API: 0-based indices, half-open ranges [l, r). Internally tree is 1-based.
pub struct Fenwick {
    n: usize,
    tree: Vec<i64>, // tree[0] is unused
}

impl Fenwick {
    pub fn new(n: usize) -> Self {
        Fenwick { n, tree: vec![0; n + 1] } // @a: init
    }

    /// a[i] += delta (i is 0-based).
    pub fn add(&mut self, i: usize, delta: i64) {
        let mut p = i + 1; // @a: addStart
        while p <= self.n {
            self.tree[p] += delta; // @a: addApply
            p += p & p.wrapping_neg(); // @a: addNext
        }
    }

    /// Sum of a[0..r).
    pub fn prefix(&self, r: usize) -> i64 {
        let mut sum = 0; // @a: prefixStart+1
        let mut p = r;
        while p > 0 {
            sum += self.tree[p]; // @a: prefixAccum
            p -= p & p.wrapping_neg(); // @a: prefixNext
        }
        sum // @a: prefixReturn
    }

    /// Sum of a[l..r).
    pub fn range(&self, l: usize, r: usize) -> i64 {
        self.prefix(r) - self.prefix(l) // @a: rangeCompute
    }
}
