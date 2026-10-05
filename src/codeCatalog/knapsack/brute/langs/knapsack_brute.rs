/// 0-1 knapsack brute force — complete Rust reference (capacity W is `cap`).
pub fn knapsack_brute(weights: &[usize], values: &[i64], cap: usize) -> i64 {
    let n = weights.len();
    let mut best = 0;
    let total: u64 = 1 << n;
    for mask in 0..total { // @a: enum
        let mut wt = 0;
        let mut val = 0;
        for i in 0..n {
            if mask & (1 << i) != 0 {
                wt += weights[i]; // @a: sum
                val += values[i];
            }
        }
        if wt <= cap && val > best { // @a: feasible+1
            best = val;
        }
    }
    best // @a: done
}
