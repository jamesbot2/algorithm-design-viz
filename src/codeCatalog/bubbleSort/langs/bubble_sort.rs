/// Bubble sort — complete Rust reference.
pub fn bubble_sort(a: &[i64]) -> Vec<i64> {
    let mut arr = a.to_vec();
    let n = arr.len();
    for i in 0..n.saturating_sub(1) { // @a: init
        for j in 0..n - 1 - i {
            if arr[j] > arr[j + 1] { // @a: compare
                arr.swap(j, j + 1); // @a: swap
            }
        }
    }
    arr // @a: done, return
}
