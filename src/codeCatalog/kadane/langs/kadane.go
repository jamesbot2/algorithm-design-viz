package algorithms

// kadaneResult is the best non-empty subarray: its sum and inclusive bounds.
type kadaneResult struct{ best, start, end int }

// kadane max subarray (non-empty) — complete Go reference; nil for empty input.
func kadane(a []int) *kadaneResult {
	if len(a) == 0 { // @a: emptyInput+1
		return nil
	}
	best := a[0] // @a: init+4
	cur := a[0]
	bestStart := 0
	bestEnd := 0
	curStart := 0
	for i := 1; i < len(a); i++ { // @a: loopVisit
		if cur+a[i] < a[i] { // @a: chooseCond
			cur = a[i] // @a: resetWrite+1
			curStart = i
		} else {
			cur = cur + a[i] // @a: extendWrite
		}
		if cur > best { // @a: bestCond
			best = cur // @a: updateBest+2
			bestStart = curStart
			bestEnd = i
		}
	}
	return &kadaneResult{best, bestStart, bestEnd} // @a: done
}
