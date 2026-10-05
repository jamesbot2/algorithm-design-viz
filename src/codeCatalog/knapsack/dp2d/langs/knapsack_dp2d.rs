/// 0-1 knapsack DP 2D — complete Rust reference. Returns (max_value, selected).
pub fn knapsack_dp2d(weights: &[usize], values: &[i64], cap: usize) -> (i64, Vec<usize>) {
    let n = weights.len();
    let mut dp = vec![vec![0i64; cap + 1]; n + 1]; // @a: init
    for i in 1..=n {
        let wt = weights[i - 1];
        let val = values[i - 1];
        for w in 0..=cap {
            dp[i][w] = dp[i - 1][w]; // @a: fill
            if w >= wt {
                let take = dp[i - 1][w - wt] + val; // @a: take
                if take > dp[i][w] { dp[i][w] = take; } // @a: takeWrite
            }
        }
    }
    let mut selected: Vec<usize> = Vec::new();
    let mut w = cap;
    for i in (1..=n).rev() {
        if dp[i][w] != dp[i - 1][w] {
            selected.push(i - 1); // @a: reconstruct
            w -= weights[i - 1];
        }
    }
    selected.reverse();
    (dp[n][cap], selected) // @a: done, return
}
