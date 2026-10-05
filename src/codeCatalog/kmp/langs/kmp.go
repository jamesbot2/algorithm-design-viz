// KMP string matching — complete Go reference.
package algorithms

// kmpSearch returns every start index where pattern occurs in text.
func kmpSearch(text, pattern string) []int {
	hits := []int{}
	if len(pattern) == 0 { // @a: emptyPattern+1
		return []int{0}
	}
	lps := buildLps(pattern) // @a: buildLps
	i := 0
	j := 0
	for i < len(text) {
		if text[i] == pattern[j] { // @a: match
			i++
			j++
			if j == len(pattern) {
				hits = append(hits, i-j) // @a: hit
				j = lps[j-1]
			}
		} else if j > 0 { // @a: fallback
			j = lps[j-1] // @a: fallbackWrite
		} else {
			i++ // @a: advance
		}
	}
	return hits // @a: done, return
}

func buildLps(pattern string) []int {
	lps := make([]int, len(pattern))
	length := 0
	i := 1
	for i < len(pattern) {
		if pattern[i] == pattern[length] { // @a: lpsCompare
			length++ // @a: lpsExtend+1
			lps[i] = length
			i++
		} else if length > 0 { // @a: lpsFallbackCond
			length = lps[length-1] // @a: lpsFallback
		} else {
			lps[i] = 0 // @a: lpsZero+1
			i++
		}
	}
	return lps // @a: lpsReturn
}
