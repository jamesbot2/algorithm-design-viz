def insertion_sort(a: list[int]) -> list[int]:
    """Insertion sort — complete Python reference."""
    arr = list(a)
    for i in range(1, len(arr)):
        key = arr[i]  # @a: outer
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]  # @a: shift
            j -= 1
        arr[j + 1] = key  # @a: insert
    return arr  # @a: done, return
