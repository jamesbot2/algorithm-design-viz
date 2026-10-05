package algorithms

// mergeSort — complete Go reference (in-place merge, L/R/k).
func mergeSort(a []int) []int {
	arr := append([]int(nil), a...)
	sortRange(arr, 0, len(arr)-1)
	return arr // @a: done
}

func sortRange(a []int, L, R int) {
	if L >= R { // @a: return+1
		return
	}
	mid := (L + R) / 2 // @a: divide
	sortRange(a, L, mid) // @a: recurse+1
	sortRange(a, mid+1, R)
	mergeRange(a, L, mid, R)
}

func mergeRange(a []int, L, mid, R int) {
	left := append([]int(nil), a[L:mid+1]...) // @a: mergeSlice+1
	right := append([]int(nil), a[mid+1:R+1]...)
	i, j, k := 0, 0, L
	for i < len(left) && j < len(right) {
		if left[i] <= right[j] { // @a: mergeCompare
			a[k] = left[i] // @a: mergeWriteLeft
			i++
			k++
		} else {
			a[k] = right[j] // @a: mergeWriteRight
			j++
			k++
		}
	}
	for i < len(left) {
		a[k] = left[i] // @a: mergeCopyLeft
		i++
		k++
	}
	for j < len(right) {
		a[k] = right[j] // @a: mergeCopyRight
		j++
		k++
	}
}
