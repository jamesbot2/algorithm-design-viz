package algorithms

import (
	"math"
	"sort"
)

// Activity is a half-open interval [Start, Finish).
type Activity struct {
	ID            string
	Start, Finish float64
}

// activitySelection — greedy by finish time, complete Go reference.
func activitySelection(activities []Activity) []string {
	sorted := append([]Activity(nil), activities...)
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].Finish < sorted[j].Finish }) // @a: sort
	picked := []string{}
	lastFinish := math.Inf(-1)
	for _, act := range sorted {
		if act.Start >= lastFinish { // @a: check
			picked = append(picked, act.ID) // @a: pick
			lastFinish = act.Finish
		}
	}
	return picked // @a: done
}
