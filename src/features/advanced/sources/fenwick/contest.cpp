// Fenwick tree (BIT) — contest version. Point add, prefix / range sum; 0-based, half-open [l, r).
// O(log n) per op, O(n) memory. Sums must fit in T (long long by default: |sum| < 9.2e18).
// C++17, header <vector>. Interface: add(i,d), prefix(r) = sum a[0..r), sum(l,r) = sum a[l..r).
#include <vector>
template <class T = long long>
struct BIT {
  int n;
  std::vector<T> t;  // 1-based internally, t[0] unused
  explicit BIT(int n = 0) : n(n), t(n + 1) {}
  void add(int i, T d) { for (++i; i <= n; i += i & -i) t[i] += d; }
  T prefix(int r) const { T s = 0; for (; r > 0; r -= r & -r) s += t[r]; return s; }
  T sum(int l, int r) const { return prefix(r) - prefix(l); }
};
