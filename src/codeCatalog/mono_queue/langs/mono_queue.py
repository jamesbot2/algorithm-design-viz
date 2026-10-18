"""Monotonic deque. sliding_max: maximum of every window of length k (1 <= k <= len(a))."""
from collections import deque


def sliding_max(a: list[int], k: int) -> list[int]:
    out: list[int] = []
    dq: deque[int] = deque()  # indices; values strictly decrease from front to back
    for i in range(len(a)):
        while dq and a[dq[-1]] <= a[i]:  # @a: mqPopBack
            dq.pop()
        dq.append(i)  # @a: mqPush
        if dq[0] <= i - k:  # @a: mqExpire
            dq.popleft()
        if i >= k - 1:  # @a: mqEmit
            out.append(a[dq[0]])
    return out


def sliding_min(a: list[int], k: int) -> list[int]:
    """Minimum of every window: the maximum of the negated array, negated back."""
    return [-x for x in sliding_max([-x for x in a], k)]
