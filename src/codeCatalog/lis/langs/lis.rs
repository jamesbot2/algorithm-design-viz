// Strictly increasing LIS in O(n log n) with recovery. Returns [length, one longest strictly increasing subsequence...].
pub fn lis(a: &[i64]) -> Vec<i64> {
    let mut tails: Vec<usize> = Vec::new(); // tails[k] = index of the smallest possible tail of length k+1
    let mut prev: Vec<i64> = vec![-1; a.len()];
    for i in 0..a.len() {
        let (mut lo, mut hi) = (0usize, tails.len());
        while lo < hi { // @a: lisSearch+4
            let mid = (lo + hi) / 2;
            if a[tails[mid]] < a[i] { lo = mid + 1; }
            else { hi = mid; }
        }
        if lo > 0 { prev[i] = tails[lo - 1] as i64; } // @a: lisPrev
        if lo == tails.len() { tails.push(i); } // @a: lisPlace+1
        else { tails[lo] = i; }
    }
    let mut seq: Vec<i64> = Vec::new();
    let mut k: i64 = tails.last().map_or(-1, |&t| t as i64);
    while k >= 0 { seq.push(a[k as usize]); k = prev[k as usize]; } // @a: lisRecover
    seq.reverse();
    let mut res = vec![seq.len() as i64]; // @a: lisReturn+1
    res.extend(seq);
    res
}
