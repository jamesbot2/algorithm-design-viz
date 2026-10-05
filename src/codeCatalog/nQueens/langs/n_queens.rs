/// N-Queens backtracking — complete Rust reference.
pub fn solve_n_queens(n: usize) -> Vec<Vec<i32>> {
    fn is_safe(cols: &[i32], row: usize, col: i32) -> bool {
        for r in 0..row {
            let c = cols[r];
            if c == col || (c - col).abs() == (row - r) as i32 { // @a: conflict+1
                return false;
            }
        }
        true
    }
    fn dfs(row: usize, n: usize, cols: &mut Vec<i32>, solutions: &mut Vec<Vec<i32>>) { // @a: call
        if row == n {
            solutions.push(cols.clone()); // @a: solution
            return;
        }
        for col in 0..n as i32 {
            if !is_safe(cols, row, col) {
                continue;
            }
            cols[row] = col; // @a: place
            dfs(row + 1, n, cols, solutions); // @a: recurse
            cols[row] = -1; // @a: backtrack
        }
    }
    let mut solutions: Vec<Vec<i32>> = Vec::new();
    let mut cols = vec![-1; n];
    dfs(0, n, &mut cols, &mut solutions);
    solutions // @a: done, return
}
