/// 0-1 knapsack 1D WRONG forward update (counterexample) — complete Rust reference (capacity W is `cap`).
pub fn knapsack_dp1d_wrong_forward(weights: &[usize], values: &[i64], cap: usize) -> i64 {
    let mut dp = vec![0i64; cap + 1]; // @a: init
    for i in 0..weights.len() {
        let wt = weights[i];
        let val = values[i];
        for w in wt..=cap { // @a: forward
            dp[w] = dp[w].max(dp[w - wt] + val); // @a: update
        }
    }
    dp[cap] // @a: done
}
