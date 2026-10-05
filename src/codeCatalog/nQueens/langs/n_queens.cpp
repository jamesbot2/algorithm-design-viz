// N-Queens backtracking — complete C++17 reference.
#include <cstdlib>
#include <functional>
#include <vector>

std::vector<std::vector<int>> solveNQueens(int n) {
    std::vector<std::vector<int>> solutions;
    std::vector<int> cols(n, -1);
    auto isSafe = [&](int row, int col) -> bool {
        for (int r = 0; r < row; r++) {
            int c = cols[r];
            if (c == col || std::abs(c - col) == row - r) return false; // @a: conflict
        }
        return true;
    };
    std::function<void(int)> dfs = [&](int row) { // @a: call
        if (row == n) {
            solutions.push_back(cols); // @a: solution
            return;
        }
        for (int col = 0; col < n; col++) {
            if (!isSafe(row, col)) continue;
            cols[row] = col; // @a: place
            dfs(row + 1); // @a: recurse
            cols[row] = -1; // @a: backtrack
        }
    };
    dfs(0);
    return solutions; // @a: done, return
}
