"""Strictly increasing LIS in O(n log n) with recovery. Returns [length, *one longest strictly increasing subsequence]."""


def lis(a: list[int]) -> list[int]:
    tails: list[int] = []  # tails[k] = index of the smallest possible tail of a strictly increasing subsequence of length k+1
    prev = [-1] * len(a)
    for i in range(len(a)):
        lo, hi = 0, len(tails)
        while lo < hi:  # @a: lisSearch+4
            mid = (lo + hi) // 2
            if a[tails[mid]] < a[i]:
                lo = mid + 1
            else:
                hi = mid
        if lo > 0:  # @a: lisPrev+1
            prev[i] = tails[lo - 1]
        if lo == len(tails):  # @a: lisPlace+3
            tails.append(i)
        else:
            tails[lo] = i
    seq: list[int] = []
    k = tails[-1] if tails else -1  # @a: lisRecover+3
    while k >= 0:
        seq.append(a[k])
        k = prev[k]
    seq.reverse()
    return [len(seq)] + seq  # @a: lisReturn
