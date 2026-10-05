def quick_sort(a: list[int]) -> list[int]:
    """Quick sort (Lomuto, i = L-1 style) — Python reference aligned with the trace."""
    arr = list(a)
    qs(arr, 0, len(arr) - 1)
    return arr  # @a: done, return


def qs(arr: list[int], L: int, R: int) -> None:
    if L >= R:  # @a: baseCase+1
        return
    p = partition(arr, L, R)  # @a: recurse+2
    qs(arr, L, p - 1)
    qs(arr, p + 1, R)


def partition(arr: list[int], L: int, R: int) -> int:
    pivot = arr[R]  # @a: partition
    i = L - 1
    for j in range(L, R):
        if arr[j] <= pivot:  # @a: compare
            i += 1  # @a: loopSwap+1, swap+1
            arr[i], arr[j] = arr[j], arr[i]
    p = i + 1  # @a: pivotPlace+1
    arr[p], arr[R] = arr[R], arr[p]
    return p
