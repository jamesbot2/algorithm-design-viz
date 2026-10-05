package algorithms

// bubbleSort — complete Go reference.
func bubbleSort(a []int) []int {
	arr := append([]int(nil), a...)
	n := len(arr)
	for i := 0; i < n-1; i++ { // @a: init
		for j := 0; j < n-1-i; j++ {
			if arr[j] > arr[j+1] { // @a: compare
				arr[j], arr[j+1] = arr[j+1], arr[j] // @a: swap
			}
		}
	}
	return arr // @a: done, return
}
