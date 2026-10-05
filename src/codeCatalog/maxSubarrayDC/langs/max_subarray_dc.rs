/// Max subarray divide-and-conquer — complete Rust reference.
pub fn max_subarray_dc(a: &[i64]) -> i64 {
    fn solve(a: &[i64], lo: usize, hi: usize) -> i64 {
        if lo == hi { // @a: base+1
            return a[lo];
        }
        let mid = (lo + hi) >> 1; // @a: divide
        let left = solve(a, lo, mid);
        let right = solve(a, mid + 1, hi);
        let cross = crossing(a, lo, mid, hi); // @a: cross
        left.max(right).max(cross) // @a: combine
    }
    fn crossing(a: &[i64], lo: usize, mid: usize, hi: usize) -> i64 {
        let mut left_sum = i64::MIN;
        let mut s = 0;
        for i in (lo..=mid).rev() {
            s += a[i];
            if s > left_sum { left_sum = s; }
        }
        let mut right_sum = i64::MIN;
        s = 0;
        for i in mid + 1..=hi {
            s += a[i];
            if s > right_sum { right_sum = s; }
        }
        left_sum + right_sum
    }
    if a.is_empty() { // @a: empty+1
        return 0;
    }
    solve(a, 0, a.len() - 1) // @a: done
}
