"""Prefix sums and difference arrays. 0-based, half-open [l, r)."""


def prefix_sums(a: list[int]) -> list[int]:
    p = [0] * (len(a) + 1)  # @a: prefixInit
    for i in range(len(a)):
        p[i + 1] = p[i] + a[i]  # @a: prefixStep
    return p


def range_sum(p: list[int], l: int, r: int) -> int:
    """Sum of a[l..r) from p = prefix_sums(a)."""
    return p[r] - p[l]  # @a: rangeSumRet


def range_sums(a: list[int], qs: list[int]) -> list[int]:
    """Answer flat queries [l0, r0, l1, r1, ...]."""
    p = prefix_sums(a)
    return [range_sum(p, qs[i], qs[i + 1]) for i in range(0, len(qs) - 1, 2)]


def range_add_all(a: list[int], ups: list[int]) -> list[int]:
    """Apply flat updates [l, r, v, ...] (a[l..r) += v) with a difference array: O(n + q)."""
    d = [0] * (len(a) + 1)
    for i in range(0, len(ups) - 2, 3):
        d[ups[i]] += ups[i + 2]  # @a: diffL
        d[ups[i + 1]] -= ups[i + 2]  # @a: diffR
    out = []
    run = 0
    for i in range(len(a)):
        run += d[i]  # @a: restoreRun
        out.append(a[i] + run)  # @a: restoreOut
    return out
