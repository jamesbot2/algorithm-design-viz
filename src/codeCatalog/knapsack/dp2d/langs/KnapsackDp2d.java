import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** 0-1 knapsack DP 2D — complete Java reference. */
public final class KnapsackDp2d {
    public record Result(long maxValue, List<Integer> selected) {}

    public static Result knapsackDp2d(int[] weights, long[] values, int W) {
        int n = weights.length;
        long[][] dp = new long[n + 1][W + 1]; // @a: init
        for (int i = 1; i <= n; i++) {
            int wt = weights[i - 1];
            long val = values[i - 1];
            for (int w = 0; w <= W; w++) {
                dp[i][w] = dp[i - 1][w]; // @a: fill
                if (w >= wt) {
                    long take = dp[i - 1][w - wt] + val; // @a: take
                    if (take > dp[i][w]) dp[i][w] = take; // @a: takeWrite
                }
            }
        }
        List<Integer> selected = new ArrayList<>();
        int w = W;
        for (int i = n; i >= 1; i--) {
            if (dp[i][w] != dp[i - 1][w]) {
                selected.add(i - 1); // @a: reconstruct
                w -= weights[i - 1];
            }
        }
        Collections.reverse(selected);
        return new Result(dp[n][W], selected); // @a: done, return
    }
}
