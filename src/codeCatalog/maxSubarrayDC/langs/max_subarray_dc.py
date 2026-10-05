def max_subarray_dc(a: list[int]) -> int:
    """Max subarray divide-and-conquer — complete Python reference."""
    def solve(lo: int, hi: int) -> int:
        if lo == hi:  # @a: base+1
            return a[lo]
        mid = (lo + hi) >> 1  # @a: divide
        left = solve(lo, mid)
        right = solve(mid + 1, hi)
        cross = crossing(lo, mid, hi)  # @a: cross
        return max(left, right, cross)  # @a: combine

    def crossing(lo: int, mid: int, hi: int) -> int:
        left_sum = float("-inf")
        s = 0
        for i in range(mid, lo - 1, -1):
            s += a[i]
            if s > left_sum:
                left_sum = s
        right_sum = float("-inf")
        s = 0
        for i in range(mid + 1, hi + 1):
            s += a[i]
            if s > right_sum:
                right_sum = s
        return int(left_sum + right_sum)

    if not a:  # @a: empty+1
        return 0
    return solve(0, len(a) - 1)  # @a: done
