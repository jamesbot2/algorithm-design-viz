// Binary search on the answer: split a (all > 0) into at most k contiguous parts, minimise the largest part sum.
pub fn segments_needed(a: &[i64], cap: i64) -> i64 {
    let mut cnt = 1; // @a: fInit
    let mut cur = 0;
    for &x in a {
        if cur + x > cap { // @a: fCheck
            cnt += 1; // @a: fNew+1
            cur = x;
        } else { cur += x; } // @a: fExtend
    }
    cnt // @a: fReturn
}

/// segments_needed for each cap in caps (every cap must be >= max(a)).
pub fn segments_list(a: &[i64], caps: &[i64]) -> Vec<i64> {
    caps.iter().map(|&c| segments_needed(a, c)).collect()
}

pub fn min_largest_sum(a: &[i64], k: i64) -> i64 {
    let mut lo = *a.iter().max().unwrap(); // @a: bsInit+1
    let mut hi: i64 = a.iter().sum();
    while lo < hi {
        let mid = lo + (hi - lo) / 2; // @a: bsMid
        if segments_needed(a, mid) <= k { // @a: bsCheck
            hi = mid; // @a: bsShrink
        } else {
            lo = mid + 1; // @a: bsRaise
        }
    }
    lo // @a: bsReturn
}
