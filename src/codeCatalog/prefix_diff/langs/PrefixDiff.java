/** Prefix sums and difference arrays. 0-based, half-open [l, r). */
public class PrefixDiff {
    static long[] prefixSums(long[] a) {
        long[] p = new long[a.length + 1]; // @a: prefixInit
        for (int i = 0; i < a.length; i++) p[i + 1] = p[i] + a[i]; // @a: prefixStep
        return p;
    }

    /** Sum of a[l..r) from p = prefixSums(a). */
    static long rangeSum(long[] p, int l, int r) {
        return p[r] - p[l]; // @a: rangeSumRet
    }

    /** Answer flat queries [l0, r0, l1, r1, ...]. */
    static long[] rangeSums(long[] a, long[] qs) {
        long[] p = prefixSums(a);
        long[] out = new long[qs.length / 2];
        for (int i = 0; i + 1 < qs.length; i += 2) out[i / 2] = rangeSum(p, (int) qs[i], (int) qs[i + 1]);
        return out;
    }

    /** Apply flat updates [l, r, v, ...] (a[l..r) += v) with a difference array: O(n + q). */
    static long[] rangeAddAll(long[] a, long[] ups) {
        long[] d = new long[a.length + 1];
        for (int i = 0; i + 2 < ups.length; i += 3) {
            d[(int) ups[i]] += ups[i + 2]; // @a: diffL
            d[(int) ups[i + 1]] -= ups[i + 2]; // @a: diffR
        }
        long[] out = new long[a.length];
        long run = 0;
        for (int i = 0; i < a.length; i++) {
            run += d[i]; // @a: restoreRun
            out[i] = a[i] + run; // @a: restoreOut
        }
        return out;
    }
}
