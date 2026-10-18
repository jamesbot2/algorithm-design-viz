package main

// Monotonic deque. SlidingMax: maximum of every window of length k (1 <= k <= len(a)).
func SlidingMax(a []int64, k int64) []int64 {
	out := []int64{}
	dq := []int{} // indices; values strictly decrease from front to back
	for i := range a {
		for len(dq) > 0 && a[dq[len(dq)-1]] <= a[i] { // @a: mqPopBack
			dq = dq[:len(dq)-1]
		}
		dq = append(dq, i) // @a: mqPush
		if int64(dq[0]) <= int64(i)-k { // @a: mqExpire
			dq = dq[1:]
		}
		if int64(i) >= k-1 { // @a: mqEmit
			out = append(out, a[dq[0]])
		}
	}
	return out
}

// SlidingMin returns the minimum of every window: the maximum of the negated array, negated back.
func SlidingMin(a []int64, k int64) []int64 {
	neg := make([]int64, len(a))
	for i, x := range a {
		neg[i] = -x
	}
	r := SlidingMax(neg, k)
	for i := range r {
		r[i] = -r[i]
	}
	return r
}
