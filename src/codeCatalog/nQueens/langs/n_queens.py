def solve_n_queens(n: int) -> list[list[int]]:
    """N-Queens backtracking — complete Python reference."""
    solutions: list[list[int]] = []
    cols = [-1] * n

    def is_safe(row: int, col: int) -> bool:
        for r in range(row):
            c = cols[r]
            if c == col or abs(c - col) == row - r:  # @a: conflict+1
                return False
        return True

    def dfs(row: int) -> None:  # @a: call
        if row == n:
            solutions.append(cols[:])  # @a: solution
            return
        for col in range(n):
            if not is_safe(row, col):
                continue
            cols[row] = col  # @a: place
            dfs(row + 1)  # @a: recurse
            cols[row] = -1  # @a: backtrack

    dfs(0)
    return solutions  # @a: done, return
