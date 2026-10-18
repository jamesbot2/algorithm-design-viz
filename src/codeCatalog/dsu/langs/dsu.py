class DSU:
    """DSU (union by size + path compression), teaching version. Elements are 0..n-1."""

    def __init__(self, n: int) -> None:
        self.parent = list(range(n))  # @a: init+2
        self.size = [1] * n
        self.count = n  # number of disjoint sets

    def find(self, x: int) -> int:
        """Root of x; afterwards every node on the path points directly at the root."""
        root = x  # @a: findStart
        while self.parent[root] != root:  # @a: findClimb+1
            root = self.parent[root]
        while self.parent[x] != root:  # @a: compress+3
            nxt = self.parent[x]
            self.parent[x] = root
            x = nxt
        return root  # @a: findReturn

    def union(self, a: int, b: int) -> bool:
        """Merge the sets of a and b. Returns True if they were different sets."""
        ra, rb = self.find(a), self.find(b)  # @a: unionFind
        if ra == rb:  # @a: unionSame+1
            return False
        if self.size[ra] < self.size[rb]:  # @a: unionSwap+1
            ra, rb = rb, ra
        self.parent[rb] = ra  # @a: unionLink+2
        self.size[ra] += self.size[rb]
        self.count -= 1
        return True  # @a: unionDone

    def same(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)  # @a: sameCompare
