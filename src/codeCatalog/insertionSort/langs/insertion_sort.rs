/// Insertion sort — complete Rust reference (j is signed so it can reach -1, like the TypeScript).
pub fn insertion_sort(a: &[i64]) -> Vec<i64> {
    let mut arr = a.to_vec();
    for i in 1..arr.len() {
        let key = arr[i]; // @a: outer
        let mut j = i as isize - 1;
        while j >= 0 && arr[j as usize] > key {
            arr[(j + 1) as usize] = arr[j as usize]; // @a: shift
            j -= 1;
        }
        arr[(j + 1) as usize] = key; // @a: insert
    }
    arr // @a: done, return
}
