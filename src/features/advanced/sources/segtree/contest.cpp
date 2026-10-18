// Segment tree (iterative, bottom-up) — contest version. Point assign + range sum; 0-based, half-open [l, r).
// O(log n) per op, O(n) memory; works for any n (not only powers of two) because sum is commutative.
// Sums must fit in T (long long by default). C++17, header <vector>. Interface: set(i,v), sum(l,r).
// Different control flow from the teaching (recursive) version, so there is no execution mapping for this one.
#include <vector>
template <class T = long long>
struct SegTree {
  int n;
  std::vector<T> t;  // leaves at [n, 2n); t[i] = t[2i] + t[2i+1]
  explicit SegTree(int n = 0) : n(n), t(2 * n) {}
  void set(int i, T v) {
    for (t[i += n] = v; i > 1; i >>= 1) t[i >> 1] = t[i] + t[i ^ 1];
  }
  T sum(int l, int r) const {
    T s = 0;
    for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
      if (l & 1) s += t[l++];
      if (r & 1) s += t[--r];
    }
    return s;
  }
};
