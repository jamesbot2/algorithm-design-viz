/** 0-1 knapsack 1D correct (reverse) — complete Java reference. */
public final class KnapsackDp1dCorrect {
    public static long knapsackDp1dCorrect(int[] weights, long[] values, int W) {
        long[] dp = new long[W + 1]; // @a: init
        for (int i = 0; i < weights.length; i++) {
            int wt = weights[i];
            long val = values[i];
            for (int w = W; w >= wt; w--) { // @a: reverse
                dp[w] = Math.max(dp[w], dp[w - wt] + val); // @a: update
            }
        }
        return dp[W]; // @a: done
    }
}
