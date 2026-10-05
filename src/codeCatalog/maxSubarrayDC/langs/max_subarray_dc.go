package algorithms

import "math"

// maxSubarrayDC — max subarray divide-and-conquer, complete Go reference.
func maxSubarrayDC(a []int) int {
	var crossing func(lo, mid, hi int) int
	var solve func(lo, hi int) int
	solve = func(lo, hi int) int {
		if lo == hi { // @a: base+1
			return a[lo]
		}
		mid := (lo + hi) >> 1 // @a: divide
		left := solve(lo, mid)
		right := solve(mid+1, hi)
		cross := crossing(lo, mid, hi) // @a: cross
		return max(left, right, cross) // @a: combine
	}
	crossing = func(lo, mid, hi int) int {
		leftSum := math.MinInt
		s := 0
		for i := mid; i >= lo; i-- {
			s += a[i]
			if s > leftSum {
				leftSum = s
			}
		}
		rightSum := math.MinInt
		s = 0
		for i := mid + 1; i <= hi; i++ {
			s += a[i]
			if s > rightSum {
				rightSum = s
			}
		}
		return leftSum + rightSum
	}
	if len(a) == 0 { // @a: empty+1
		return 0
	}
	return solve(0, len(a)-1) // @a: done
}
