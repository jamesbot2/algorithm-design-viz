def lcs(X: str, Y: str) -> tuple[int, str]:
    """LCS DP + reconstruct — complete Python reference."""
    m = len(X)
    n = len(Y)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):  # @a: init+3
        dp[i][0] = 0
    for j in range(n + 1):
        dp[0][j] = 0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if X[i - 1] == Y[j - 1]:  # @a: compareChars
                dp[i][j] = dp[i - 1][j - 1] + 1  # @a: takeDiagonal, write, dpWrite
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])  # @a: dpFill
    i = m  # @a: reconstructStart+1
    j = n
    chars: list[str] = []
    while i > 0 and j > 0:
        if X[i - 1] == Y[j - 1]:
            chars.append(X[i - 1])  # @a: reconstruct
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:  # @a: reconstructMove, reconstructCompare
            i -= 1  # @a: reconstructUp
        else:
            j -= 1  # @a: reconstructLeft
    return dp[m][n], "".join(reversed(chars))  # @a: done
