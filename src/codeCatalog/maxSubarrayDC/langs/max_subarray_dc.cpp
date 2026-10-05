// Max subarray divide-and-conquer — complete C++17 reference.
#include <algorithm>
#include <climits>
#include <functional>
#include <vector>

long long maxSubarrayDC(const std::vector<long long>& a) {
    std::function<long long(int, int, int)> crossing;
    std::function<long long(int, int)> solve = [&](int lo, int hi) -> long long {
        if (lo == hi) return a[lo]; // @a: base
        int mid = (lo + hi) >> 1; // @a: divide
        long long left = solve(lo, mid);
        long long right = solve(mid + 1, hi);
        long long cross = crossing(lo, mid, hi); // @a: cross
        return std::max({left, right, cross}); // @a: combine
    };
    crossing = [&](int lo, int mid, int hi) -> long long {
        long long leftSum = LLONG_MIN;
        long long s = 0;
        for (int i = mid; i >= lo; i--) {
            s += a[i];
            if (s > leftSum) leftSum = s;
        }
        long long rightSum = LLONG_MIN;
        s = 0;
        for (int i = mid + 1; i <= hi; i++) {
            s += a[i];
            if (s > rightSum) rightSum = s;
        }
        return leftSum + rightSum;
    };
    if (a.empty()) return 0; // @a: empty
    return solve(0, static_cast<int>(a.size()) - 1); // @a: done
}
