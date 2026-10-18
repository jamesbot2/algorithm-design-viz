package main

// Monotonic stack. NextGreater: index of the next STRICTLY greater element to the right, or -1.
func NextGreater(a []int64) []int64 {
	res := make([]int64, len(a))
	for i := range res {
		res[i] = -1 // @a: msInit
	}
	st := []int{} // indices; values never increase from bottom to top
	for i := range a {
		for len(st) > 0 && a[st[len(st)-1]] < a[i] { // @a: msPopCheck
			res[st[len(st)-1]] = int64(i) // @a: msPop
			st = st[:len(st)-1]
		}
		st = append(st, i) // @a: msPush
	}
	return res // @a: msReturn
}

// LargestRectangle returns the largest rectangle in a histogram of non-negative heights (unit-width bars).
func LargestRectangle(h []int64) int64 {
	st := []int{} // indices; heights strictly increase from bottom to top
	var best int64
	for i := 0; i <= len(h); i++ {
		var cur int64 // sentinel height 0 flushes the stack
		if i < len(h) {
			cur = h[i]
		}
		for len(st) > 0 && h[st[len(st)-1]] >= cur { // @a: lrPopCheck
			height := h[st[len(st)-1]] // @a: lrPop
			st = st[:len(st)-1]
			left := 0 // @a: lrArea+3
			if len(st) > 0 {
				left = st[len(st)-1] + 1
			}
			if v := height * int64(i-left); v > best {
				best = v
			}
		}
		st = append(st, i) // @a: lrPush
	}
	return best // @a: lrReturn
}
