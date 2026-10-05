def matrix_chain_order(dims: list[int]) -> tuple[int, list[list[int]]]:
    """Matrix-chain order DP — complete Python reference. Returns (cost, split)."""
    n = len(dims) - 1
    dp: list[list[float]] = [[0] * n for _ in range(n)]  # @a: init+1
    split = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):  # @a: lenLoop
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float("inf")
            for k in range(i, j):  # @a: trySplit
                cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]  # @a: cost
                if cost < dp[i][j]:  # @a: update
                    dp[i][j] = cost
                    split[i][j] = k
    return int(dp[0][n - 1]), split  # @a: done
