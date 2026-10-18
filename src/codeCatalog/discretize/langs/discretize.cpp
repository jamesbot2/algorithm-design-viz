#include <algorithm>
#include <vector>

// Coordinate compression (discretization). Ranks are 0-based indices among the sorted distinct values.
std::vector<long long> unique_sorted(const std::vector<long long>& a) {
  std::vector<long long> s = a;
  std::sort(s.begin(), s.end());  // @a: sortCopy
  std::vector<long long> u;
  for (long long v : s) {
    if (u.empty() || u.back() != v) u.push_back(v);  // @a: dedupKeep
  }
  return u;
}

// First index i with u[i] >= x (u sorted ascending); u.size() if none.
long long lower_bound_idx(const std::vector<long long>& u, long long x) {
  size_t lo = 0, hi = u.size();
  while (lo < hi) {
    size_t mid = lo + (hi - lo) / 2;
    if (u[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return (long long)lo;  // @a: lbReturn
}

// rank[i] = index of a[i] among the distinct sorted values.
std::vector<long long> compress(const std::vector<long long>& a) {
  std::vector<long long> u = unique_sorted(a), r;
  for (long long v : a) r.push_back(lower_bound_idx(u, v));  // @a: rankCall
  return r;
}

// For each query x: how many distinct values are < x.
std::vector<long long> lower_ranks(const std::vector<long long>& a, const std::vector<long long>& qs) {
  std::vector<long long> u = unique_sorted(a), r;
  for (long long x : qs) r.push_back(lower_bound_idx(u, x));  // @a: queryCall
  return r;
}
