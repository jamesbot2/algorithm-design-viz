// 0-1 knapsack brute force — complete C++17 reference.
#include <vector>

long long knapsackBrute(const std::vector<int>& weights, const std::vector<long long>& values, int W) {
    int n = static_cast<int>(weights.size());
    long long best = 0;
    long long total = 1LL << n;
    for (long long mask = 0; mask < total; mask++) { // @a: enum
        long long wt = 0;
        long long val = 0;
        for (int i = 0; i < n; i++) {
            if (mask & (1LL << i)) {
                wt += weights[i]; // @a: sum
                val += values[i];
            }
        }
        if (wt <= W && val > best) best = val; // @a: feasible
    }
    return best; // @a: done
}
