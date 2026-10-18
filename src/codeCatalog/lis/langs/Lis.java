/** Strictly increasing LIS in O(n log n) with recovery. Returns [length, one longest strictly increasing subsequence...]. */
public class Lis {
    static long[] lis(long[] a) {
        int n = a.length;
        int[] tails = new int[n]; // tails[k] = index of the smallest possible tail of length k+1
        int len = 0;
        int[] prev = new int[n];
        java.util.Arrays.fill(prev, -1);
        for (int i = 0; i < n; i++) {
            int lo = 0, hi = len;
            while (lo < hi) { // @a: lisSearch+4
                int mid = (lo + hi) / 2;
                if (a[tails[mid]] < a[i]) lo = mid + 1;
                else hi = mid;
            }
            if (lo > 0) prev[i] = tails[lo - 1]; // @a: lisPrev
            tails[lo] = i; // @a: lisPlace+1
            if (lo == len) len++;
        }
        long[] res = new long[len + 1];
        res[0] = len;
        int m = len;
        for (int k = len > 0 ? tails[len - 1] : -1; k >= 0; k = prev[k]) res[m--] = a[k]; // @a: lisRecover
        return res; // @a: lisReturn
    }
}
