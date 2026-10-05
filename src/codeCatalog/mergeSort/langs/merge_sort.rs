/// Merge sort — complete Rust reference (in-place merge, lo/hi/k).
pub fn merge_sort(a: &[i64]) -> Vec<i64> {
    let mut arr = a.to_vec();
    let hi = arr.len() as isize - 1;
    sort(&mut arr, 0, hi);
    arr // @a: done
}

fn sort(a: &mut [i64], lo: isize, hi: isize) {
    if lo >= hi { // @a: return+1
        return;
    }
    let mid = (lo + hi) / 2; // @a: divide
    sort(a, lo, mid); // @a: recurse+1
    sort(a, mid + 1, hi);
    merge(a, lo as usize, mid as usize, hi as usize);
}

fn merge(a: &mut [i64], lo: usize, mid: usize, hi: usize) {
    let left = a[lo..mid + 1].to_vec(); // @a: mergeSlice+1
    let right = a[mid + 1..hi + 1].to_vec();
    let (mut i, mut j, mut k) = (0, 0, lo);
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] { // @a: mergeCompare
            a[k] = left[i]; // @a: mergeWriteLeft
            i += 1;
            k += 1;
        } else {
            a[k] = right[j]; // @a: mergeWriteRight
            j += 1;
            k += 1;
        }
    }
    while i < left.len() {
        a[k] = left[i]; // @a: mergeCopyLeft
        i += 1;
        k += 1;
    }
    while j < right.len() {
        a[k] = right[j]; // @a: mergeCopyRight
        j += 1;
        k += 1;
    }
}
