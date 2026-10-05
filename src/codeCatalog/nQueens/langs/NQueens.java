import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** N-Queens backtracking — complete Java reference. */
public final class NQueens {
    private final int n;
    private final int[] cols;
    private final List<int[]> solutions = new ArrayList<>();

    private NQueens(int n) {
        this.n = n;
        this.cols = new int[n];
        Arrays.fill(cols, -1);
    }

    public static List<int[]> solveNQueens(int n) {
        NQueens s = new NQueens(n);
        s.dfs(0);
        return s.solutions; // @a: done, return
    }

    private boolean isSafe(int row, int col) {
        for (int r = 0; r < row; r++) {
            int c = cols[r];
            if (c == col || Math.abs(c - col) == row - r) return false; // @a: conflict
        }
        return true;
    }

    private void dfs(int row) { // @a: call
        if (row == n) {
            solutions.add(cols.clone()); // @a: solution
            return;
        }
        for (int col = 0; col < n; col++) {
            if (!isSafe(row, col)) continue;
            cols[row] = col; // @a: place
            dfs(row + 1); // @a: recurse
            cols[row] = -1; // @a: backtrack
        }
    }
}
