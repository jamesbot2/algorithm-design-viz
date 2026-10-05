/// Matrix-chain order DP — complete Rust reference. Returns (cost, split).
pub fn matrix_chain_order(dims: &[i64]) -> (i64, Vec<Vec<usize>>) {
    let n = dims.len() - 1;
    let mut dp = vec![vec![0i64; n]; n]; // @a: init+1
    let mut split = vec![vec![0usize; n]; n];
    for len in 2..=n { // @a: lenLoop
        for i in 0..=n - len {
            let j = i + len - 1;
            dp[i][j] = i64::MAX;
            for k in i..j { // @a: trySplit
                let cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]; // @a: cost
                if cost < dp[i][j] { // @a: update
                    dp[i][j] = cost;
                    split[i][j] = k;
                }
            }
        }
    }
    (dp[0][n - 1], split) // @a: done
}
