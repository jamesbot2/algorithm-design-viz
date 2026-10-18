import java.util.Arrays;

/** Coordinate compression (discretization). Ranks are 0-based indices among the sorted distinct values. */
public class Discretize {
    static long[] uniqueSorted(long[] a) {
        long[] s = a.clone();
        Arrays.sort(s); // @a: sortCopy
        long[] u = new long[s.length];
        int m = 0;
        for (long v : s) {
            if (m == 0 || u[m - 1] != v) u[m++] = v; // @a: dedupKeep
        }
        return Arrays.copyOf(u, m);
    }

    /** First index i with u[i] >= x (u sorted ascending); u.length if none. */
    static long lowerBound(long[] u, long x) {
        int lo = 0;
        int hi = u.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (u[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        return lo; // @a: lbReturn
    }

    /** rank[i] = index of a[i] among the distinct sorted values. */
    static long[] compress(long[] a) {
        long[] u = uniqueSorted(a);
        long[] r = new long[a.length];
        for (int i = 0; i < a.length; i++) r[i] = lowerBound(u, a[i]); // @a: rankCall
        return r;
    }

    /** For each query x: how many distinct values are < x. */
    static long[] lowerRanks(long[] a, long[] qs) {
        long[] u = uniqueSorted(a);
        long[] r = new long[qs.length];
        for (int i = 0; i < qs.length; i++) r[i] = lowerBound(u, qs[i]); // @a: queryCall
        return r;
    }
}
