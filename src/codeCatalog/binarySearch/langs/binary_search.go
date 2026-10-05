package algorithms

// binarySearch — leftmost (lower-bound style) Go reference.
func binarySearch(a []int, target int) int {
	lo := 0 // @a: init+2
	hi := len(a) - 1
	candidate := -1
	for lo <= hi {
		mid := lo + ((hi - lo) >> 1) // @a: mid
		if a[mid] == target { // @a: equal+2
			candidate = mid
			hi = mid - 1
		} else if a[mid] < target { // @a: less+1
			lo = mid + 1
		} else { // @a: greater+1
			hi = mid - 1
		}
	}
	return candidate // @a: found, miss
}
