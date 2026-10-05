def kadane(a: list[int]) -> tuple[int, int, int] | None:
    """Kadane max subarray (non-empty) — complete Python reference. Returns (best, start, end)."""
    if not a:  # @a: emptyInput+1
        return None  # empty input: there is no non-empty subarray (not a zero-sum one)
    best = a[0]  # @a: init+4
    cur = a[0]
    best_start = 0
    best_end = 0
    cur_start = 0
    for i in range(1, len(a)):  # @a: loopVisit
        if cur + a[i] < a[i]:  # @a: chooseCond
            cur = a[i]  # @a: resetWrite+1
            cur_start = i
        else:
            cur = cur + a[i]  # @a: extendWrite
        if cur > best:  # @a: bestCond
            best = cur  # @a: updateBest+2
            best_start = cur_start
            best_end = i
    return best, best_start, best_end  # @a: done
