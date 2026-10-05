/// 0-1 knapsack 1D correct (reverse) — complete Rust reference (capacity W is `cap`).
pub fn knapsack_dp1d_correct(weights: &[usize], values: &[i64], cap: usize) -> i64 {
    let mut dp = vec![0i64; cap + 1]; // @a: init
    for i in 0..weights.len() {
        let wt = weights[i];
        let val = values[i];
        for w in (wt..=cap).rev() { // @a: reverse
            dp[w] = dp[w].max(dp[w - wt] + val); // @a: update
        }
    }
    dp[cap] // @a: done
}
