// Prefix sums + difference array — contest version. 0-based, half-open [l, r).
// Prefix<T>: O(n) build, O(1) range sum. Diff<T>: O(1) range add, O(n) apply(); offline use (all updates, then read).
// Sums must fit in T (long long by default). C++17, header <vector>.
#include <vector>
template <class T = long long>
struct Prefix {
  std::vector<T> p;
  explicit Prefix(const std::vector<T>& a) : p(a.size() + 1) {
    for (size_t i = 0; i < a.size(); i++) p[i + 1] = p[i] + a[i];
  }
  T sum(int l, int r) const { return p[r] - p[l]; }
};
template <class T = long long>
struct Diff {
  std::vector<T> d;
  explicit Diff(int n) : d(n + 1) {}
  void add(int l, int r, T v) { d[l] += v; d[r] -= v; }
  std::vector<T> apply(const std::vector<T>& a) const {
    std::vector<T> out(a.size());
    T run = 0;
    for (size_t i = 0; i < a.size(); i++) { run += d[i]; out[i] = a[i] + run; }
    return out;
  }
};

