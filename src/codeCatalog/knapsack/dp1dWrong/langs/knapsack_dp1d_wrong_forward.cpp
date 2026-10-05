// 0-1 knapsack 1D WRONG forward update (counterexample) — complete C++17 reference.
#include <algorithm>
#include <vector>

long long knapsackDp1dWrongForward(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    std::vector<long long> dp(W + 1, 0); // @a: init
    for (size_t i = 0; i < weights.size(); i++) {
        int wt = weights[i];
        long long val = values[i];
        for (int w = wt; w <= W; w++) { // @a: forward
            dp[w] = std::max(dp[w], dp[w - wt] + val); // @a: update
        }
    }
    return dp[W]; // @a: done
}
