// Binary search on the answer — contest version: split a (all > 0) into at most k contiguous parts,
// minimise the largest part sum. Generic shape: find the smallest x in [lo, hi] with ok(x) true (ok is monotone).
// O(n log(sum)). Sums must fit in long long. C++17, headers <algorithm> <numeric> <vector>.
#include <algorithm>
#include <numeric>
#include <vector>
template <class Pred>
long long first_true(long long lo, long long hi, Pred ok) {  // smallest x in [lo, hi] with ok(x); hi must satisfy ok
  while (lo < hi) {
    long long mid = lo + (hi - lo) / 2;
    if (ok(mid)) hi = mid; else lo = mid + 1;
  }
  return lo;
}
long long parts_needed(const std::vector<long long>& a, long long cap) {  // greedy: cut as late as possible
  long long c = 1, cur = 0;
  for (long long x : a) { if (cur + x > cap) { c++; cur = x; } else cur += x; }
  return c;
}
long long min_largest(const std::vector<long long>& a, long long k) {
  return first_true(*std::max_element(a.begin(), a.end()), std::accumulate(a.begin(), a.end(), 0LL), [&](long long cap) { return parts_needed(a, cap) <= k; });
}

