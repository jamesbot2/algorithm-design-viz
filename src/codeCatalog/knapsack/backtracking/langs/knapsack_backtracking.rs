/// 0-1 knapsack backtracking — complete Rust reference (capacity W is `cap`).
pub fn knapsack_backtracking(weights: &[usize], values: &[i64], cap: usize) -> i64 {
    fn dfs(i: usize, rem_w: usize, cur: i64, weights: &[usize], values: &[i64], best: &mut i64) { // @a: call
        if i == weights.len() {
            if cur > *best { // @a: best+1
                *best = cur;
            }
            return;
        }
        dfs(i + 1, rem_w, cur, weights, values, best); // @a: skip
        if weights[i] <= rem_w {
            dfs(i + 1, rem_w - weights[i], cur + values[i], weights, values, best); // @a: take
        }
    }
    let mut best = 0;
    dfs(0, cap, 0, weights, values, &mut best);
    best
}
