"""Binary search on the answer: split a (all > 0) into at most k contiguous parts, minimise the largest part sum."""


def segments_needed(a: list[int], cap: int) -> int:
    cnt = 1  # @a: fInit
    cur = 0
    for x in a:
        if cur + x > cap:  # @a: fCheck
            cnt += 1  # @a: fNew+1
            cur = x
        else:
            cur += x  # @a: fExtend
    return cnt  # @a: fReturn


def segments_list(a: list[int], caps: list[int]) -> list[int]:
    """segments_needed for each cap in caps (every cap must be >= max(a))."""
    return [segments_needed(a, c) for c in caps]


def min_largest_sum(a: list[int], k: int) -> int:
    lo = max(a)  # @a: bsInit+1
    hi = sum(a)
    while lo < hi:
        mid = lo + (hi - lo) // 2  # @a: bsMid
        if segments_needed(a, mid) <= k:  # @a: bsCheck
            hi = mid  # @a: bsShrink
        else:
            lo = mid + 1  # @a: bsRaise
    return lo  # @a: bsReturn
