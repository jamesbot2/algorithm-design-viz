package main

import "sort"

// Coordinate compression (discretization). Ranks are 0-based indices among the sorted distinct values.
func UniqueSorted(a []int64) []int64 {
	s := append([]int64{}, a...)
	sort.Slice(s, func(i, j int) bool { return s[i] < s[j] }) // @a: sortCopy
	u := []int64{}
	for _, v := range s {
		if len(u) == 0 || u[len(u)-1] != v { u = append(u, v) } // @a: dedupKeep
	}
	return u
}

// LowerBound returns the first index i with u[i] >= x (u sorted ascending); len(u) if none.
func LowerBound(u []int64, x int64) int64 {
	lo, hi := 0, len(u)
	for lo < hi {
		mid := lo + (hi-lo)/2
		if u[mid] < x {
			lo = mid + 1
		} else {
			hi = mid
		}
	}
	return int64(lo) // @a: lbReturn
}

// Compress returns rank[i] = index of a[i] among the distinct sorted values.
func Compress(a []int64) []int64 {
	u := UniqueSorted(a)
	r := make([]int64, len(a))
	for i, v := range a { r[i] = LowerBound(u, v) } // @a: rankCall
	return r
}

// LowerRanks returns, for each query x, how many distinct values are < x.
func LowerRanks(a []int64, qs []int64) []int64 {
	u := UniqueSorted(a)
	r := make([]int64, len(qs))
	for i, x := range qs { r[i] = LowerBound(u, x) } // @a: queryCall
	return r
}
