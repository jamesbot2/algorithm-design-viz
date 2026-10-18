import java.util.Arrays;

/** Binary search on the answer: split a (all > 0) into at most k contiguous parts, minimise the largest part sum. */
public class BsAnswer {
    static long segmentsNeeded(long[] a, long cap) {
        long cnt = 1; // @a: fInit
        long cur = 0;
        for (long x : a) {
            if (cur + x > cap) { // @a: fCheck
                cnt++; // @a: fNew+1
                cur = x;
            } else cur += x; // @a: fExtend
        }
        return cnt; // @a: fReturn
    }

    /** segmentsNeeded for each cap in caps (every cap must be >= max(a)). */
    static long[] segmentsList(long[] a, long[] caps) {
        long[] r = new long[caps.length];
        for (int i = 0; i < caps.length; i++) r[i] = segmentsNeeded(a, caps[i]);
        return r;
    }

    static long minLargestSum(long[] a, long k) {
        long lo = Arrays.stream(a).max().getAsLong(); // @a: bsInit+1
        long hi = Arrays.stream(a).sum();
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2; // @a: bsMid
            if (segmentsNeeded(a, mid) <= k) { // @a: bsCheck
                hi = mid; // @a: bsShrink
            } else {
                lo = mid + 1; // @a: bsRaise
            }
        }
        return lo; // @a: bsReturn
    }
}
