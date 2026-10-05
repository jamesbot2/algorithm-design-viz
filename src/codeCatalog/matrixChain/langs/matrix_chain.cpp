// Matrix-chain order DP — complete C++17 reference.
#include <climits>
#include <utility>
#include <vector>

std::pair<long long, std::vector<std::vector<int>>> matrixChainOrder(const std::vector<long long>& dims) {
    int n = static_cast<int>(dims.size()) - 1;
    std::vector<std::vector<long long>> dp(n, std::vector<long long>(n, 0)); // @a: init+1
    std::vector<std::vector<int>> split(n, std::vector<int>(n, 0));
    for (int len = 2; len <= n; len++) { // @a: lenLoop
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = LLONG_MAX;
            for (int k = i; k < j; k++) { // @a: trySplit
                long long cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]; // @a: cost
                if (cost < dp[i][j]) { // @a: update
                    dp[i][j] = cost;
                    split[i][j] = k;
                }
            }
        }
    }
    return {dp[0][n - 1], split}; // @a: done
}
