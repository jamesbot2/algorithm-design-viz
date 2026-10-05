/// Kadane max subarray (non-empty) — complete Rust reference. Returns (best, start, end).
pub fn kadane(a: &[i64]) -> Option<(i64, usize, usize)> {
    if a.is_empty() { // @a: emptyInput+1
        return None; // empty input: there is no non-empty subarray
    }
    let mut best = a[0]; // @a: init+4
    let mut cur = a[0];
    let mut best_start = 0;
    let mut best_end = 0;
    let mut cur_start = 0;
    for i in 1..a.len() { // @a: loopVisit
        if cur + a[i] < a[i] { // @a: chooseCond
            cur = a[i]; // @a: resetWrite+1
            cur_start = i;
        } else {
            cur = cur + a[i]; // @a: extendWrite
        }
        if cur > best { // @a: bestCond
            best = cur; // @a: updateBest+2
            best_start = cur_start;
            best_end = i;
        }
    }
    Some((best, best_start, best_end)) // @a: done
}
