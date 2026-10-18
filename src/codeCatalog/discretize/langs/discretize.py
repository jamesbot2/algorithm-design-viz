"""Coordinate compression (discretization). Ranks are 0-based indices among the sorted distinct values."""


def unique_sorted(a: list[int]) -> list[int]:
    s = sorted(a)  # @a: sortCopy
    u: list[int] = []
    for v in s:
        if not u or u[-1] != v:  # @a: dedupKeep
            u.append(v)
    return u


def lower_bound(u: list[int], x: int) -> int:
    """First index i with u[i] >= x (u sorted ascending); len(u) if none."""
    lo, hi = 0, len(u)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if u[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo  # @a: lbReturn


def compress(a: list[int]) -> list[int]:
    """rank[i] = index of a[i] among the distinct sorted values."""
    u = unique_sorted(a)
    return [lower_bound(u, v) for v in a]  # @a: rankCall


def lower_ranks(a: list[int], qs: list[int]) -> list[int]:
    """For each query x: how many distinct values are < x."""
    u = unique_sorted(a)
    return [lower_bound(u, x) for x in qs]  # @a: queryCall
