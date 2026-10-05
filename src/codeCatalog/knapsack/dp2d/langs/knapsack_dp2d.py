def knapsack_dp2d(weights: list[int], values: list[int], W: int) -> tuple[int, list[int]]:
    """0-1 knapsack DP 2D — complete Python reference. Returns (max_value, selected)."""
    n = len(weights)
    dp = [[0] * (W + 1) for _ in range(n + 1)]  # @a: init
    for i in range(1, n + 1):
        wt = weights[i - 1]
        val = values[i - 1]
        for w in range(W + 1):
            dp[i][w] = dp[i - 1][w]  # @a: fill
            if w >= wt:
                take = dp[i - 1][w - wt] + val  # @a: take
                if take > dp[i][w]:  # @a: takeWrite+1
                    dp[i][w] = take
    selected: list[int] = []
    w = W
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i - 1][w]:
            selected.append(i - 1)  # @a: reconstruct
            w -= weights[i - 1]
    selected.reverse()
    return dp[n][W], selected  # @a: done, return
