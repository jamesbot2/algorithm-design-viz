package main

// Prefix sums and difference arrays. 0-based, half-open [l, r).
func PrefixSums(a []int64) []int64 {
	p := make([]int64, len(a)+1) // @a: prefixInit
	for i := range a {
		p[i+1] = p[i] + a[i] // @a: prefixStep
	}
	return p
}

// RangeSum returns the sum of a[l..r) from p = PrefixSums(a).
func RangeSum(p []int64, l, r int) int64 {
	return p[r] - p[l] // @a: rangeSumRet
}

// RangeSums answers flat queries [l0, r0, l1, r1, ...].
func RangeSums(a []int64, qs []int64) []int64 {
	p := PrefixSums(a)
	out := []int64{}
	for i := 0; i+1 < len(qs); i += 2 {
		out = append(out, RangeSum(p, int(qs[i]), int(qs[i+1])))
	}
	return out
}

// RangeAddAll applies flat updates [l, r, v, ...] (a[l..r) += v) with a difference array: O(n + q).
func RangeAddAll(a []int64, ups []int64) []int64 {
	d := make([]int64, len(a)+1)
	for i := 0; i+2 < len(ups); i += 3 {
		d[ups[i]] += ups[i+2] // @a: diffL
		d[ups[i+1]] -= ups[i+2] // @a: diffR
	}
	out := make([]int64, len(a))
	var run int64
	for i := range a {
		run += d[i] // @a: restoreRun
		out[i] = a[i] + run // @a: restoreOut
	}
	return out
}
