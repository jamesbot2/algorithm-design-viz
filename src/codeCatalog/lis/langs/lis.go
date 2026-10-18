package main

// Strictly increasing LIS in O(n log n) with recovery. Returns [length, one longest strictly increasing subsequence...].
func Lis(a []int64) []int64 {
	n := len(a)
	tails := []int{} // tails[k] = index of the smallest possible tail of length k+1
	prev := make([]int, n)
	for i := range prev {
		prev[i] = -1
	}
	for i := 0; i < n; i++ {
		lo, hi := 0, len(tails)
		for lo < hi { // @a: lisSearch+4
			mid := (lo + hi) / 2
			if a[tails[mid]] < a[i] {
				lo = mid + 1
			} else {
				hi = mid
			}
		}
		if lo > 0 { prev[i] = tails[lo-1] } // @a: lisPrev
		if lo == len(tails) { tails = append(tails, i) } else { tails[lo] = i } // @a: lisPlace
	}
	seq := []int64{}
	k := -1
	if len(tails) > 0 { k = tails[len(tails)-1] }
	for ; k >= 0; k = prev[k] { seq = append(seq, a[k]) } // @a: lisRecover
	res := []int64{int64(len(seq))} // @a: lisReturn+1
	for t := len(seq) - 1; t >= 0; t-- { res = append(res, seq[t]) }
	return res
}
