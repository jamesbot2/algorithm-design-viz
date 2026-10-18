/// DSU (union by size + path compression), teaching version. Elements are 0..n-1.
pub struct Dsu {
    pub parent: Vec<usize>,
    pub size: Vec<usize>,
    pub count: usize, // number of disjoint sets
}

impl Dsu {
    pub fn new(n: usize) -> Self {
        Dsu { parent: (0..n).collect(), size: vec![1; n], count: n } // @a: init
    }

    /// Root of x; afterwards every node on the path points directly at the root.
    pub fn find(&mut self, mut x: usize) -> usize {
        let mut root = x; // @a: findStart
        while self.parent[root] != root { // @a: findClimb+2
            root = self.parent[root];
        }
        while self.parent[x] != root { // @a: compress+4
            let next = self.parent[x];
            self.parent[x] = root;
            x = next;
        }
        root // @a: findReturn
    }

    /// Merge the sets of a and b. Returns true if they were different sets.
    pub fn union(&mut self, a: usize, b: usize) -> bool {
        let (mut ra, mut rb) = (self.find(a), self.find(b)); // @a: unionFind
        if ra == rb { return false; } // @a: unionSame
        if self.size[ra] < self.size[rb] { std::mem::swap(&mut ra, &mut rb); } // @a: unionSwap
        self.parent[rb] = ra; // @a: unionLink+2
        self.size[ra] += self.size[rb];
        self.count -= 1;
        true // @a: unionDone
    }

    pub fn same(&mut self, a: usize, b: usize) -> bool {
        self.find(a) == self.find(b) // @a: sameCompare
    }
}
