/// LCS DP + reconstruct — complete Rust reference.
pub fn lcs(x_str: &str, y_str: &str) -> (usize, String) {
    let x: Vec<char> = x_str.chars().collect();
    let y: Vec<char> = y_str.chars().collect();
    let (m, n) = (x.len(), y.len());
    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    for i in 0..=m { // @a: init+5
        dp[i][0] = 0;
    }
    for j in 0..=n {
        dp[0][j] = 0;
    }
    for i in 1..=m {
        for j in 1..=n {
            if x[i - 1] == y[j - 1] { // @a: compareChars
                dp[i][j] = dp[i - 1][j - 1] + 1; // @a: takeDiagonal, write, dpWrite
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]); // @a: dpFill
            }
        }
    }
    let mut i = m; // @a: reconstructStart+1
    let mut j = n;
    let mut chars: Vec<char> = Vec::new();
    while i > 0 && j > 0 {
        if x[i - 1] == y[j - 1] {
            chars.push(x[i - 1]); // @a: reconstruct
            i -= 1;
            j -= 1;
        } else if dp[i - 1][j] >= dp[i][j - 1] { // @a: reconstructMove, reconstructCompare
            i -= 1; // @a: reconstructUp
        } else {
            j -= 1; // @a: reconstructLeft
        }
    }
    (dp[m][n], chars.iter().rev().collect()) // @a: done
}
