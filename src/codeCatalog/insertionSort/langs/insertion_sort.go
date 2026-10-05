package algorithms

// insertionSort — complete Go reference.
func insertionSort(a []int) []int {
	arr := append([]int(nil), a...)
	for i := 1; i < len(arr); i++ {
		key := arr[i] // @a: outer
		j := i - 1
		for j >= 0 && arr[j] > key {
			arr[j+1] = arr[j] // @a: shift
			j--
		}
		arr[j+1] = key // @a: insert
	}
	return arr // @a: done, return
}
