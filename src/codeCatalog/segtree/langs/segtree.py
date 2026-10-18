class SegTree:
    """Segment tree (point assign + range sum), teaching version. 0-based, half-open [l, r)."""

    def __init__(self, a: list[int]) -> None:
        self.n = len(a)
        self.tree = [0] * (4 * max(1, self.n))  # tree[node] = sum of a[lo, hi); node 1 is the root
        if self.n > 0:
            self._build(a, 1, 0, self.n)  # @a: buildCall

    def _build(self, a: list[int], node: int, lo: int, hi: int) -> None:
        if hi - lo == 1:
            self.tree[node] = a[lo]  # @a: buildLeaf
            return
        mid = lo + (hi - lo) // 2
        self._build(a, 2 * node, lo, mid)
        self._build(a, 2 * node + 1, mid, hi)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]  # @a: buildPull

    def set(self, i: int, v: int) -> None:
        """a[i] = v"""
        self._set(1, 0, self.n, i, v)  # @a: setCall

    def _set(self, node: int, lo: int, hi: int, i: int, v: int) -> None:
        if hi - lo == 1:
            self.tree[node] = v  # @a: setLeaf
            return
        mid = lo + (hi - lo) // 2
        if i < mid:  # @a: setDescend+3
            self._set(2 * node, lo, mid, i, v)
        else:
            self._set(2 * node + 1, mid, hi, i, v)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]  # @a: setPull

    def sum(self, l: int, r: int) -> int:
        """Sum of a[l..r)."""
        return self._query(1, 0, self.n, l, r)  # @a: sumCall

    def _query(self, node: int, lo: int, hi: int, l: int, r: int) -> int:
        if r <= lo or hi <= l:  # @a: queryOutside
            return 0
        if l <= lo and hi <= r:  # @a: queryInside
            return self.tree[node]
        mid = lo + (hi - lo) // 2
        return self._query(2 * node, lo, mid, l, r) + self._query(2 * node + 1, mid, hi, l, r)  # @a: querySplit
