/** 0-1 knapsack backtracking — complete Java reference. */
public final class KnapsackBacktracking {
    private final int[] weights;
    private final long[] values;
    private long best = 0;

    private KnapsackBacktracking(int[] weights, long[] values) {
        this.weights = weights;
        this.values = values;
    }

    public static long knapsackBacktracking(int[] weights, long[] values, int W) {
        KnapsackBacktracking s = new KnapsackBacktracking(weights, values);
        s.dfs(0, W, 0);
        return s.best;
    }

    private void dfs(int i, int remW, long cur) { // @a: call
        if (i == weights.length) {
            if (cur > best) best = cur; // @a: best
            return;
        }
        dfs(i + 1, remW, cur); // @a: skip
        if (weights[i] <= remW) {
            dfs(i + 1, remW - weights[i], cur + values[i]); // @a: take
        }
    }
}
