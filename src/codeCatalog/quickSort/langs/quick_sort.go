package algorithms

// quickSort (Lomuto, i = L-1 style) — Go reference aligned with the trace.
func quickSort(a []int) []int {
	arr := append([]int(nil), a...)
	qs(arr, 0, len(arr)-1)
	return arr // @a: done, return
}

func qs(arr []int, L, R int) {
	if L >= R { // @a: baseCase+1
		return
	}
	p := partition(arr, L, R) // @a: recurse+2
	qs(arr, L, p-1)
	qs(arr, p+1, R)
}

func partition(arr []int, L, R int) int {
	pivot := arr[R] // @a: partition
	i := L - 1
	for j := L; j < R; j++ {
		if arr[j] <= pivot { // @a: compare
			i++ // @a: loopSwap+1, swap+1
			arr[i], arr[j] = arr[j], arr[i]
		}
	}
	p := i + 1 // @a: pivotPlace+1
	arr[p], arr[R] = arr[R], arr[p]
	return p
}
