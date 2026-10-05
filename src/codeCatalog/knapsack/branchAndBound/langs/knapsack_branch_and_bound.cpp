// 0-1 knapsack branch-and-bound (density bound) — complete C++17 reference.
#include <algorithm>
#include <functional>
#include <numeric>
#include <vector>

long long knapsackBranchAndBound(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    int n = static_cast<int>(weights.size());
    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0);
    std::stable_sort(order.begin(), order.end(), [&](int a, int b) { return 1.0 * values[a] / weights[a] > 1.0 * values[b] / weights[b]; });
    long long best = 0;
    auto bound = [&](int i, int remW, long long cur) -> double { // @a: bound
        double b = cur;
        int w = remW;
        for (int k = i; k < n; k++) {
            int idx = order[k];
            if (weights[idx] <= w) {
                w -= weights[idx];
                b += values[idx];
            } else {
                b += 1.0 * values[idx] / weights[idx] * w;
                break;
            }
        }
        return b;
    };
    std::function<void(int, int, long long)> dfs = [&](int i, int remW, long long cur) {
        if (i == n) {
            if (cur > best) best = cur;
            return;
        }
        if (bound(i, remW, cur) <= best) return; // @a: prune
        int idx = order[i];
        if (weights[idx] <= remW) dfs(i + 1, remW - weights[idx], cur + values[idx]); // @a: take
        dfs(i + 1, remW, cur); // @a: skip
    };
    dfs(0, W, 0);
    return best;
}
