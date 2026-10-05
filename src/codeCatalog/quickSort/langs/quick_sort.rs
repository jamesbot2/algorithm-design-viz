/// Quick sort (Lomuto, i = lo-1 style) — Rust reference aligned with the trace.
pub fn quick_sort(a: &[i64]) -> Vec<i64> {
    let mut arr = a.to_vec();
    let hi = arr.len() as isize - 1;
    qs(&mut arr, 0, hi);
    arr // @a: done, return
}

fn qs(arr: &mut [i64], lo: isize, hi: isize) {
    if lo >= hi { // @a: baseCase+1
        return;
    }
    let p = partition(arr, lo, hi); // @a: recurse+2
    qs(arr, lo, p - 1);
    qs(arr, p + 1, hi);
}

fn partition(arr: &mut [i64], lo: isize, hi: isize) -> isize {
    let pivot = arr[hi as usize]; // @a: partition
    let mut i = lo - 1;
    for j in lo..hi {
        if arr[j as usize] <= pivot { // @a: compare
            i += 1; // @a: loopSwap+1, swap+1
            arr.swap(i as usize, j as usize);
        }
    }
    let p = i + 1; // @a: pivotPlace+1
    arr.swap(p as usize, hi as usize);
    p
}
