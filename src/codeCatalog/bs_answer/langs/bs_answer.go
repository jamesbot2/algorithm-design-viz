package main

// Binary search on the answer: split a (all > 0) into at most k contiguous parts, minimise the largest part sum.
func SegmentsNeeded(a []int64, cap int64) int64 {
	var cnt int64 = 1 // @a: fInit
	var cur int64
	for _, x := range a {
		if cur+x > cap { // @a: fCheck
			cnt++ // @a: fNew+1
			cur = x
		} else {
			cur += x // @a: fExtend
		}
	}
	return cnt // @a: fReturn
}

// SegmentsList returns SegmentsNeeded for each cap in caps (every cap must be >= max(a)).
func SegmentsList(a []int64, caps []int64) []int64 {
	r := make([]int64, len(caps))
	for i, c := range caps {
		r[i] = SegmentsNeeded(a, c)
	}
	return r
}

func MinLargestSum(a []int64, k int64) int64 {
	lo, hi := a[0], int64(0) // @a: bsInit+6
	for _, x := range a {
		if x > lo {
			lo = x
		}
		hi += x
	}
	for lo < hi {
		mid := lo + (hi-lo)/2 // @a: bsMid
		if SegmentsNeeded(a, mid) <= k { // @a: bsCheck
			hi = mid // @a: bsShrink
		} else {
			lo = mid + 1 // @a: bsRaise
		}
	}
	return lo // @a: bsReturn
}
