package algorithms

// solveNQueens — N-Queens backtracking, complete Go reference.
func solveNQueens(n int) [][]int {
	solutions := [][]int{}
	cols := make([]int, n)
	for k := range cols {
		cols[k] = -1
	}
	isSafe := func(row, col int) bool {
		for r := 0; r < row; r++ {
			c := cols[r]
			if c == col || abs(c-col) == row-r { // @a: conflict+1
				return false
			}
		}
		return true
	}
	var dfs func(row int)
	dfs = func(row int) { // @a: call
		if row == n {
			solutions = append(solutions, append([]int(nil), cols...)) // @a: solution
			return
		}
		for col := 0; col < n; col++ {
			if !isSafe(row, col) {
				continue
			}
			cols[row] = col // @a: place
			dfs(row + 1) // @a: recurse
			cols[row] = -1 // @a: backtrack
		}
	}
	dfs(0)
	return solutions // @a: done, return
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
