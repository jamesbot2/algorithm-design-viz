class Fenwick:
    """Fenwick tree (binary indexed tree), teaching version.

    Public API: 0-based indices, half-open ranges [l, r). Internally tree is 1-based:
    tree[i] stores the sum over (i - lowbit(i), i] (1-based terms)."""

    def __init__(self, n: int) -> None:
        self.n = n
        self.tree = [0] * (n + 1)  # @a: init

    def add(self, i: int, delta: int) -> None:
        """a[i] += delta (i is 0-based)."""
        p = i + 1  # @a: addStart
        while p <= self.n:
            self.tree[p] += delta  # @a: addApply
            p += p & -p  # @a: addNext

    def prefix(self, r: int) -> int:
        """Sum of a[0..r)."""
        total = 0  # @a: prefixStart+1
        p = r
        while p > 0:
            total += self.tree[p]  # @a: prefixAccum
            p -= p & -p  # @a: prefixNext
        return total  # @a: prefixReturn

    def range(self, l: int, r: int) -> int:
        """Sum of a[l..r)."""
        return self.prefix(r) - self.prefix(l)  # @a: rangeCompute
