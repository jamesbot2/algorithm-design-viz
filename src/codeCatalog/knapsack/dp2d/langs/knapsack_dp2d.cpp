// 0-1 knapsack DP 2D — complete C++17 reference.
#include <algorithm>
#include <utility>
#include <vector>

std::pair<long long, std::vector<int>> knapsackDp2d(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    int n = static_cast<int>(weights.size());
    std::vector<std::vector<long long>> dp(n + 1, std::vector<long long>(W + 1, 0)); // @a: init
    for (int i = 1; i <= n; i++) {
        int wt = weights[i - 1];
        long long val = values[i - 1];
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w]; // @a: fill
            if (w >= wt) {
                long long take = dp[i - 1][w - wt] + val; // @a: take
                if (take > dp[i][w]) dp[i][w] = take; // @a: takeWrite
            }
        }
    }
    std::vector<int> selected;
    int w = W;
    for (int i = n; i >= 1; i--) {
        if (dp[i][w] != dp[i - 1][w]) {
            selected.push_back(i - 1); // @a: reconstruct
            w -= weights[i - 1];
        }
    }
    std::reverse(selected.begin(), selected.end());
    return {dp[n][W], selected}; // @a: done, return
}
