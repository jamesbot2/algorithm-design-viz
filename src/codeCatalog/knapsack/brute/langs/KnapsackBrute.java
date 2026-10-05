/** 0-1 knapsack brute force — complete Java reference. */
public final class KnapsackBrute {
    public static long knapsackBrute(int[] weights, long[] values, int W) {
        int n = weights.length;
        long best = 0;
        long total = 1L << n;
        for (long mask = 0; mask < total; mask++) { // @a: enum
            long wt = 0;
            long val = 0;
            for (int i = 0; i < n; i++) {
                if ((mask & (1L << i)) != 0) {
                    wt += weights[i]; // @a: sum
                    val += values[i];
                }
            }
            if (wt <= W && val > best) best = val; // @a: feasible
        }
        return best; // @a: done
    }
}
