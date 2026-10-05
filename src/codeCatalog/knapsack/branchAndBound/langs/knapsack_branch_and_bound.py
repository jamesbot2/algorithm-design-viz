def knapsack_branch_and_bound(weights: list[int], values: list[int], W: int) -> int:
    """0-1 knapsack branch-and-bound (density bound) — complete Python reference."""
    n = len(weights)
    order = sorted(range(n), key=lambda i: -values[i] / weights[i])
    best = 0

    def bound(i: int, rem_w: int, cur: float) -> float:  # @a: bound
        b = cur
        w = rem_w
        for k in range(i, n):
            idx = order[k]
            if weights[idx] <= w:
                w -= weights[idx]
                b += values[idx]
            else:
                b += values[idx] / weights[idx] * w
                break
        return b

    def dfs(i: int, rem_w: int, cur: int) -> None:
        nonlocal best
        if i == n:
            if cur > best:
                best = cur
            return
        if bound(i, rem_w, cur) <= best:  # @a: prune+1
            return
        idx = order[i]
        if weights[idx] <= rem_w:  # @a: take+1
            dfs(i + 1, rem_w - weights[idx], cur + values[idx])
        dfs(i + 1, rem_w, cur)  # @a: skip

    dfs(0, W, 0)
    return best
