/// 0-1 knapsack greedy-by-density (NOT optimal) — complete Rust reference (capacity W is `cap`).
pub fn knapsack_greedy_by_density(weights: &[usize], values: &[i64], cap: usize) -> (i64, Vec<usize>) {
    let density = |i: usize| values[i] as f64 / weights[i] as f64;
    let mut order: Vec<usize> = (0..weights.len()).collect();
    order.sort_by(|&a, &b| density(b).total_cmp(&density(a))); // @a: sort
    let mut rem = cap;
    let mut value = 0;
    let mut selected: Vec<usize> = Vec::new();
    for i in order {
        if weights[i] <= rem { // @a: check
            rem -= weights[i];
            value += values[i];
            selected.push(i); // @a: pick
        }
    }
    (value, selected) // @a: done
}
