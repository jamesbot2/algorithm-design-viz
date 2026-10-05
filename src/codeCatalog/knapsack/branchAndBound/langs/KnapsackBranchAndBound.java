import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 0-1 knapsack branch-and-bound (density bound) — complete Java reference. */
public final class KnapsackBranchAndBound {
    private final int[] weights;
    private final long[] values;
    private final int n;
    private final List<Integer> order = new ArrayList<>();
    private long best = 0;

    private KnapsackBranchAndBound(int[] weights, long[] values) {
        this.weights = weights;
        this.values = values;
        this.n = weights.length;
        for (int i = 0; i < n; i++) order.add(i);
        order.sort(Comparator.comparingDouble(i -> -(double) values[i] / weights[i]));
    }

    public static long knapsackBranchAndBound(int[] weights, long[] values, int W) {
        KnapsackBranchAndBound s = new KnapsackBranchAndBound(weights, values);
        s.dfs(0, W, 0);
        return s.best;
    }

    private double bound(int i, int remW, long cur) { // @a: bound
        double b = cur;
        int w = remW;
        for (int k = i; k < n; k++) {
            int idx = order.get(k);
            if (weights[idx] <= w) {
                w -= weights[idx];
                b += values[idx];
            } else {
                b += (double) values[idx] / weights[idx] * w;
                break;
            }
        }
        return b;
    }

    private void dfs(int i, int remW, long cur) {
        if (i == n) {
            if (cur > best) best = cur;
            return;
        }
        if (bound(i, remW, cur) <= best) return; // @a: prune
        int idx = order.get(i);
        if (weights[idx] <= remW) dfs(i + 1, remW - weights[idx], cur + values[idx]); // @a: take
        dfs(i + 1, remW, cur); // @a: skip
    }
}
