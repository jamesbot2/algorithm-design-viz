/// Binary search — leftmost (lower-bound style) Rust reference (signed bounds, -1 = not found).
pub fn binary_search(a: &[i64], target: i64) -> isize {
    let mut lo: isize = 0; // @a: init+2
    let mut hi: isize = a.len() as isize - 1;
    let mut candidate: isize = -1;
    while lo <= hi {
        let mid = lo + ((hi - lo) >> 1); // @a: mid
        if a[mid as usize] == target { // @a: equal+2
            candidate = mid;
            hi = mid - 1;
        } else if a[mid as usize] < target { // @a: less+1
            lo = mid + 1;
        } else { // @a: greater+1
            hi = mid - 1;
        }
    }
    candidate // @a: found, miss
}
