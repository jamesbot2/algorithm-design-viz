/** Max subarray divide-and-conquer — complete Java reference. */
public final class MaxSubarrayDC {
    public static long maxSubarrayDC(long[] a) {
        if (a.length == 0) return 0; // @a: empty
        return solve(a, 0, a.length - 1); // @a: done
    }

    private static long solve(long[] a, int lo, int hi) {
        if (lo == hi) return a[lo]; // @a: base
        int mid = (lo + hi) >> 1; // @a: divide
        long left = solve(a, lo, mid);
        long right = solve(a, mid + 1, hi);
        long cross = crossing(a, lo, mid, hi); // @a: cross
        return Math.max(left, Math.max(right, cross)); // @a: combine
    }

    private static long crossing(long[] a, int lo, int mid, int hi) {
        long leftSum = Long.MIN_VALUE;
        long s = 0;
        for (int i = mid; i >= lo; i--) {
            s += a[i];
            if (s > leftSum) leftSum = s;
        }
        long rightSum = Long.MIN_VALUE;
        s = 0;
        for (int i = mid + 1; i <= hi; i++) {
            s += a[i];
            if (s > rightSum) rightSum = s;
        }
        return leftSum + rightSum;
    }
}
