class LazySegTree:
    """Lazy segment tree (range add + range sum), teaching version. 0-based, half-open [l, r)."""

    def __init__(self, a: list[int]) -> None:
        self.n = len(a)
        self.total = [0] * (4 * max(1, self.n))  # total[node] = sum of a[lo, hi) with tags at or above already applied
        self.lazy = [0] * (4 * max(1, self.n))  # lazy[node] = amount still to add to EACH element under node
        if self.n > 0:
            self._build(a, 1, 0, self.n)  # @a: buildCall

    def _build(self, a: list[int], node: int, lo: int, hi: int) -> None:
        if hi - lo == 1:
            self.total[node] = a[lo]  # @a: buildLeaf
            return
        mid = lo + (hi - lo) // 2
        self._build(a, 2 * node, lo, mid)
        self._build(a, 2 * node + 1, mid, hi)
        self.total[node] = self.total[2 * node] + self.total[2 * node + 1]  # @a: buildPull

    def _apply(self, node: int, lo: int, hi: int, v: int) -> None:
        """Put tag v on node: every element in [lo, hi) gains v."""
        self.total[node] += v * (hi - lo)  # @a: applyTotal
        self.lazy[node] += v  # @a: applyTag

    def _push(self, node: int, lo: int, hi: int) -> None:
        """Hand the pending tag of node down to both children."""
        if self.lazy[node] == 0:
            return
        mid = lo + (hi - lo) // 2
        self._apply(2 * node, lo, mid, self.lazy[node])  # @a: pushLeft
        self._apply(2 * node + 1, mid, hi, self.lazy[node])  # @a: pushRight
        self.lazy[node] = 0  # @a: pushClear

    def add(self, l: int, r: int, v: int) -> None:
        """a[i] += v for every i in [l, r)."""
        self._add(1, 0, self.n, l, r, v)  # @a: addCall

    def _add(self, node: int, lo: int, hi: int, l: int, r: int, v: int) -> None:
        if r <= lo or hi <= l:  # @a: addOutside
            return
        if l <= lo and hi <= r:  # @a: addInside
            self._apply(node, lo, hi, v)
            return
        self._push(node, lo, hi)  # @a: addPush
        mid = lo + (hi - lo) // 2
        self._add(2 * node, lo, mid, l, r, v)  # @a: addSplit+1
        self._add(2 * node + 1, mid, hi, l, r, v)
        self.total[node] = self.total[2 * node] + self.total[2 * node + 1]  # @a: addPull

    def sum(self, l: int, r: int) -> int:
        """Sum of a[l..r)."""
        return self._query(1, 0, self.n, l, r)  # @a: sumCall

    def _query(self, node: int, lo: int, hi: int, l: int, r: int) -> int:
        if r <= lo or hi <= l:  # @a: queryOutside
            return 0
        if l <= lo and hi <= r:  # @a: queryInside
            return self.total[node]
        self._push(node, lo, hi)  # @a: queryPush
        mid = lo + (hi - lo) // 2
        return self._query(2 * node, lo, mid, l, r) + self._query(2 * node + 1, mid, hi, l, r)  # @a: querySplit
