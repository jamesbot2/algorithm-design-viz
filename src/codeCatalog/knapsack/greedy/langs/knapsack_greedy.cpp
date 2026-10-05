// 0-1 knapsack greedy-by-density (NOT optimal) — complete C++17 reference.
#include <algorithm>
#include <numeric>
#include <utility>
#include <vector>

std::pair<long long, std::vector<int>> knapsackGreedyByDensity(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    std::vector<int> order(weights.size());
    std::iota(order.begin(), order.end(), 0);
    std::stable_sort(order.begin(), order.end(), [&](int a, int b) { return 1.0 * values[a] / weights[a] > 1.0 * values[b] / weights[b]; }); // @a: sort
    int rem = W;
    long long value = 0;
    std::vector<int> selected;
    for (int i : order) {
        if (weights[i] <= rem) { // @a: check
            rem -= weights[i];
            value += values[i];
            selected.push_back(i); // @a: pick
        }
    }
    return {value, selected}; // @a: done
}
