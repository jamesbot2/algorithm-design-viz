def merge_sort(a: list[int]) -> list[int]:
    """Merge sort — complete Python reference (in-place merge, L/R/k)."""
    arr = list(a)
    sort(arr, 0, len(arr) - 1)
    return arr  # @a: done


def sort(a: list[int], L: int, R: int) -> None:
    if L >= R:  # @a: return+1
        return
    mid = (L + R) // 2  # @a: divide
    sort(a, L, mid)  # @a: recurse+1
    sort(a, mid + 1, R)
    merge(a, L, mid, R)


def merge(a: list[int], L: int, mid: int, R: int) -> None:
    left = a[L:mid + 1]  # @a: mergeSlice+1
    right = a[mid + 1:R + 1]
    i = 0
    j = 0
    k = L
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:  # @a: mergeCompare
            a[k] = left[i]  # @a: mergeWriteLeft
            i += 1
            k += 1
        else:
            a[k] = right[j]  # @a: mergeWriteRight
            j += 1
            k += 1
    while i < len(left):
        a[k] = left[i]  # @a: mergeCopyLeft
        i += 1
        k += 1
    while j < len(right):
        a[k] = right[j]  # @a: mergeCopyRight
        j += 1
        k += 1
