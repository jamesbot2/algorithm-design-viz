def knapsack_backtracking(weights: list[int], values: list[int], W: int) -> int:
    """0-1 knapsack backtracking — complete Python reference."""
    best = 0

    def dfs(i: int, rem_w: int, cur: int) -> None:  # @a: call
        nonlocal best
        if i == len(weights):
            if cur > best:  # @a: best+1
                best = cur
            return
        dfs(i + 1, rem_w, cur)  # @a: skip
        if weights[i] <= rem_w:
            dfs(i + 1, rem_w - weights[i], cur + values[i])  # @a: take

    dfs(0, W, 0)
    return best
