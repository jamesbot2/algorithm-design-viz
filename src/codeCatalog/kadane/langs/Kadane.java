/** Kadane max subarray (non-empty) — complete Java reference. Returns {best, start, end} or null. */
public final class Kadane {
    public static long[] kadane(long[] a) {
        if (a.length == 0) return null; // @a: emptyInput
        long best = a[0]; // @a: init+4
        long cur = a[0];
        int bestStart = 0;
        int bestEnd = 0;
        int curStart = 0;
        for (int i = 1; i < a.length; i++) { // @a: loopVisit
            if (cur + a[i] < a[i]) { // @a: chooseCond
                cur = a[i]; // @a: resetWrite+1
                curStart = i;
            } else {
                cur = cur + a[i]; // @a: extendWrite
            }
            if (cur > best) { // @a: bestCond
                best = cur; // @a: updateBest+2
                bestStart = curStart;
                bestEnd = i;
            }
        }
        return new long[] {best, bestStart, bestEnd}; // @a: done
    }
}
