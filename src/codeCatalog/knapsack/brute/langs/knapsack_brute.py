def knapsack_brute(weights: list[int], values: list[int], W: int) -> int:
    """0-1 knapsack brute force — complete Python reference."""
    n = len(weights)
    best = 0
    total = 1 << n
    for mask in range(total):  # @a: enum
        wt = 0
        val = 0
        for i in range(n):
            if mask & (1 << i):
                wt += weights[i]  # @a: sum
                val += values[i]
        if wt <= W and val > best:  # @a: feasible+1
            best = val
    return best  # @a: done
