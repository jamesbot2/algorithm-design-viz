/** Matrix-chain order DP — complete Java reference. */
public final class MatrixChain {
    public record Result(long cost, int[][] split) {}

    public static Result matrixChainOrder(long[] dims) {
        int n = dims.length - 1;
        long[][] dp = new long[n][n]; // @a: init+1
        int[][] split = new int[n][n];
        for (int len = 2; len <= n; len++) { // @a: lenLoop
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i][j] = Long.MAX_VALUE;
                for (int k = i; k < j; k++) { // @a: trySplit
                    long cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]; // @a: cost
                    if (cost < dp[i][j]) { // @a: update
                        dp[i][j] = cost;
                        split[i][j] = k;
                    }
                }
            }
        }
        return new Result(dp[0][n - 1], split); // @a: done
    }
}
