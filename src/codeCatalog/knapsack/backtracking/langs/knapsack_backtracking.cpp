// 0-1 knapsack backtracking — complete C++17 reference.
#include <functional>
#include <vector>

long long knapsackBacktracking(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    long long best = 0;
    std::function<void(size_t, int, long long)> dfs = [&](size_t i, int remW, long long cur) { // @a: call
        if (i == weights.size()) {
            if (cur > best) best = cur; // @a: best
            return;
        }
        dfs(i + 1, remW, cur); // @a: skip
        if (weights[i] <= remW) {
            dfs(i + 1, remW - weights[i], cur + values[i]); // @a: take
        }
    };
    dfs(0, W, 0);
    return best;
}
