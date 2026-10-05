// Kadane max subarray (non-empty) — complete C++17 reference.
#include <optional>
#include <vector>

struct KadaneResult { long long best; int start; int end; };

std::optional<KadaneResult> kadane(const std::vector<long long>& a) {
    if (a.empty()) return std::nullopt; // @a: emptyInput
    long long best = a[0]; // @a: init+4
    long long cur = a[0];
    int bestStart = 0;
    int bestEnd = 0;
    int curStart = 0;
    for (int i = 1; i < static_cast<int>(a.size()); i++) { // @a: loopVisit
        if (cur + a[i] < a[i]) { // @a: chooseCond
            cur = a[i]; // @a: resetWrite+1
            curStart = i;
        } else {
            cur = cur + a[i]; // @a: extendWrite
        }
        if (cur > best) { // @a: bestCond
            best = cur; // @a: updateBest+2
            bestStart = curStart;
            bestEnd = i;
        }
    }
    return KadaneResult{best, bestStart, bestEnd}; // @a: done
}
