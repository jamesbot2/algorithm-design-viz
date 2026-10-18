// Monotonic stack. next_greater: index of the next STRICTLY greater element to the right, or -1.
pub fn next_greater(a: &[i64]) -> Vec<i64> {
    let mut res = vec![-1i64; a.len()]; // @a: msInit
    let mut st: Vec<usize> = Vec::new(); // indices; values never increase from bottom to top
    for i in 0..a.len() {
        while let Some(&t) = st.last() {
            if a[t] >= a[i] { break; } // @a: msPopCheck
            res[t] = i as i64; // @a: msPop
            st.pop();
        }
        st.push(i); // @a: msPush
    }
    res // @a: msReturn
}

/// Largest rectangle in a histogram of non-negative heights (unit-width bars).
pub fn largest_rectangle(h: &[i64]) -> i64 {
    let mut st: Vec<usize> = Vec::new(); // indices; heights strictly increase from bottom to top
    let mut best = 0i64;
    for i in 0..=h.len() {
        let cur = if i == h.len() { 0 } else { h[i] }; // sentinel height 0 flushes the stack
        while let Some(&t) = st.last() {
            if h[t] < cur { break; } // @a: lrPopCheck
            let height = h[t]; // @a: lrPop
            st.pop();
            let left = st.last().map_or(0, |&p| p + 1); // @a: lrArea+1
            best = best.max(height * (i - left) as i64);
        }
        st.push(i); // @a: lrPush
    }
    best // @a: lrReturn
}
