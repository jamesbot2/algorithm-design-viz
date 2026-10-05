def knapsack_dp1d_wrong_forward(weights: list[int], values: list[int], W: int) -> int:
    """0-1 knapsack 1D WRONG forward update (counterexample) — complete Python reference."""
    dp = [0] * (W + 1)  # @a: init
    for i in range(len(weights)):
        wt = weights[i]
        val = values[i]
        for w in range(wt, W + 1):  # @a: forward
            dp[w] = max(dp[w], dp[w - wt] + val)  # @a: update
    return dp[W]  # @a: done
