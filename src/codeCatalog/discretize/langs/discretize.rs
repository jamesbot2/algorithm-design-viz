// Coordinate compression (discretization). Ranks are 0-based indices among the sorted distinct values.
pub fn unique_sorted(a: &[i64]) -> Vec<i64> {
    let mut s = a.to_vec();
    s.sort_unstable(); // @a: sortCopy
    let mut u: Vec<i64> = Vec::new();
    for v in s {
        if u.last() != Some(&v) { u.push(v); } // @a: dedupKeep
    }
    u
}

/// First index i with u[i] >= x (u sorted ascending); u.len() if none.
pub fn lower_bound(u: &[i64], x: i64) -> i64 {
    let (mut lo, mut hi) = (0usize, u.len());
    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        if u[mid] < x { lo = mid + 1; } else { hi = mid; }
    }
    lo as i64 // @a: lbReturn
}

/// rank[i] = index of a[i] among the distinct sorted values.
pub fn compress(a: &[i64]) -> Vec<i64> {
    let u = unique_sorted(a);
    a.iter().map(|&v| lower_bound(&u, v)).collect() // @a: rankCall
}

/// For each query x: how many distinct values are < x.
pub fn lower_ranks(a: &[i64], qs: &[i64]) -> Vec<i64> {
    let u = unique_sorted(a);
    qs.iter().map(|&x| lower_bound(&u, x)).collect() // @a: queryCall
}
