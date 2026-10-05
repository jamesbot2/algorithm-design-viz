def bubble_sort(a: list[int]) -> list[int]:
    """Bubble sort — complete Python reference."""
    arr = list(a)
    n = len(arr)
    for i in range(n - 1):  # @a: init
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:  # @a: compare
                arr[j], arr[j + 1] = arr[j + 1], arr[j]  # @a: swap
    return arr  # @a: done, return
