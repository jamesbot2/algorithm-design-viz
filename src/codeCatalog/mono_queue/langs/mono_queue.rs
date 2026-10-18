use std::collections::VecDeque;

// Monotonic deque. sliding_max: maximum of every window of length k (1 <= k <= a.len()).
pub fn sliding_max(a: &[i64], k: i64) -> Vec<i64> {
    let mut out = Vec::new();
    let mut dq: VecDeque<usize> = VecDeque::new(); // indices; values strictly decrease from front to back
    for i in 0..a.len() {
        while dq.back().is_some_and(|&b| a[b] <= a[i]) { dq.pop_back(); } // @a: mqPopBack
        dq.push_back(i); // @a: mqPush
        if (*dq.front().unwrap() as i64) <= i as i64 - k { dq.pop_front(); } // @a: mqExpire
        if i as i64 >= k - 1 { out.push(a[*dq.front().unwrap()]); } // @a: mqEmit
    }
    out
}

/// Minimum of every window: the maximum of the negated array, negated back.
pub fn sliding_min(a: &[i64], k: i64) -> Vec<i64> {
    let neg: Vec<i64> = a.iter().map(|x| -x).collect();
    sliding_max(&neg, k).into_iter().map(|x| -x).collect()
}
