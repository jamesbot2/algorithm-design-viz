#include <vector>

// Prefix sums and difference arrays. 0-based, half-open [l, r).
std::vector<long long> prefix_sums(const std::vector<long long>& a) {
  std::vector<long long> p(a.size() + 1, 0);  // @a: prefixInit
  for (size_t i = 0; i < a.size(); i++) p[i + 1] = p[i] + a[i];  // @a: prefixStep
  return p;
}

// Sum of a[l..r) from p = prefix_sums(a).
long long range_sum(const std::vector<long long>& p, long long l, long long r) {
  return p[r] - p[l];  // @a: rangeSumRet
}

// Answer flat queries [l0, r0, l1, r1, ...].
std::vector<long long> range_sums(const std::vector<long long>& a, const std::vector<long long>& qs) {
  std::vector<long long> p = prefix_sums(a), out;
  for (size_t i = 0; i + 1 < qs.size(); i += 2) out.push_back(range_sum(p, qs[i], qs[i + 1]));
  return out;
}

// Apply flat updates [l, r, v, ...] (a[l..r) += v) with a difference array: O(n + q).
std::vector<long long> range_add_all(const std::vector<long long>& a, const std::vector<long long>& ups) {
  std::vector<long long> d(a.size() + 1, 0), out;
  for (size_t i = 0; i + 2 < ups.size(); i += 3) {
    d[ups[i]] += ups[i + 2];  // @a: diffL
    d[ups[i + 1]] -= ups[i + 2];  // @a: diffR
  }
  long long run = 0;
  for (size_t i = 0; i < a.size(); i++) {
    run += d[i];  // @a: restoreRun
    out.push_back(a[i] + run);  // @a: restoreOut
  }
  return out;
}
