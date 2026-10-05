def knapsack_greedy_by_density(weights: list[int], values: list[int], W: int) -> tuple[int, list[int]]:
    """0-1 knapsack greedy-by-density (NOT optimal) — complete Python reference. Returns (value, selected)."""
    order = sorted(range(len(weights)), key=lambda i: -values[i] / weights[i])  # @a: sort
    rem = W
    value = 0
    selected: list[int] = []
    for i in order:
        if weights[i] <= rem:  # @a: check
            rem -= weights[i]
            value += values[i]
            selected.append(i)  # @a: pick
    return value, selected  # @a: done
