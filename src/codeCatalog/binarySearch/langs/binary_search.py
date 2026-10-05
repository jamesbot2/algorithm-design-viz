def binary_search(a: list[int], target: int) -> int:
    """Binary search — leftmost (lower-bound style) Python reference."""
    lo = 0  # @a: init+2
    hi = len(a) - 1
    candidate = -1
    while lo <= hi:
        mid = lo + ((hi - lo) >> 1)  # @a: mid
        if a[mid] == target:  # @a: equal+2
            candidate = mid
            hi = mid - 1
        elif a[mid] < target:  # @a: less+1
            lo = mid + 1
        else:  # @a: greater+1
            hi = mid - 1
    return candidate  # @a: found, miss
