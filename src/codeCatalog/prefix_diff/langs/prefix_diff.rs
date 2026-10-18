// Prefix sums and difference arrays. 0-based, half-open [l, r).
pub fn prefix_sums(a: &[i64]) -> Vec<i64> {
    let mut p = vec![0i64; a.len() + 1]; // @a: prefixInit
    for i in 0..a.len() {
        p[i + 1] = p[i] + a[i]; // @a: prefixStep
    }
    p
}

/// Sum of a[l..r) from p = prefix_sums(a).
pub fn range_sum(p: &[i64], l: usize, r: usize) -> i64 {
    p[r] - p[l] // @a: rangeSumRet
}

/// Answer flat queries [l0, r0, l1, r1, ...].
pub fn range_sums(a: &[i64], qs: &[i64]) -> Vec<i64> {
    let p = prefix_sums(a);
    qs.chunks_exact(2).map(|q| range_sum(&p, q[0] as usize, q[1] as usize)).collect()
}

/// Apply flat updates [l, r, v, ...] (a[l..r) += v) with a difference array: O(n + q).
pub fn range_add_all(a: &[i64], ups: &[i64]) -> Vec<i64> {
    let mut d = vec![0i64; a.len() + 1];
    for u in ups.chunks_exact(3) {
        d[u[0] as usize] += u[2]; // @a: diffL
        d[u[1] as usize] -= u[2]; // @a: diffR
    }
    let mut out = Vec::with_capacity(a.len());
    let mut run = 0i64;
    for i in 0..a.len() {
        run += d[i]; // @a: restoreRun
        out.push(a[i] + run); // @a: restoreOut
    }
    out
}
