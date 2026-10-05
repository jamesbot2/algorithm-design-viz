/// 0-1 knapsack branch-and-bound (density bound) — complete Rust reference (capacity W is `cap`).
pub fn knapsack_branch_and_bound(weights: &[usize], values: &[i64], cap: usize) -> i64 {
    struct Ctx<'a> {
        weights: &'a [usize],
        values: &'a [i64],
        order: Vec<usize>,
        best: i64,
    }
    fn bound(c: &Ctx, i: usize, rem_w: usize, cur: i64) -> f64 { // @a: bound
        let mut b = cur as f64;
        let mut w = rem_w;
        for k in i..c.order.len() {
            let idx = c.order[k];
            if c.weights[idx] <= w {
                w -= c.weights[idx];
                b += c.values[idx] as f64;
            } else {
                b += c.values[idx] as f64 / c.weights[idx] as f64 * w as f64;
                break;
            }
        }
        b
    }
    fn dfs(c: &mut Ctx, i: usize, rem_w: usize, cur: i64) {
        if i == c.order.len() {
            if cur > c.best {
                c.best = cur;
            }
            return;
        }
        if bound(c, i, rem_w, cur) <= c.best as f64 { // @a: prune+1
            return;
        }
        let idx = c.order[i];
        if c.weights[idx] <= rem_w { // @a: take+1
            dfs(c, i + 1, rem_w - c.weights[idx], cur + c.values[idx]);
        }
        dfs(c, i + 1, rem_w, cur); // @a: skip
    }
    let density = |i: usize| values[i] as f64 / weights[i] as f64;
    let mut order: Vec<usize> = (0..weights.len()).collect();
    order.sort_by(|&a, &b| density(b).total_cmp(&density(a)));
    let mut c = Ctx { weights, values, order, best: 0 };
    dfs(&mut c, 0, cap, 0);
    c.best
}
