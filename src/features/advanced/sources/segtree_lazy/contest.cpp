// Lazy segment tree — contest version. Range add + range sum; 0-based, half-open [l, r).
// O(log n) per op, O(4n) memory. Sums must fit in T (long long by default). C++17, header <vector>.
// Interface: LazySeg(a); add(l, r, v); sum(l, r). Tag semantics: lz[o] = amount still owed to EACH element under o.
// Same recursion as the teaching version but with fused apply/push/pull; reference only (no execution mapping).
#include <vector>
template <class T = long long>
struct LazySeg {
  int n;
  std::vector<T> s, lz;
  explicit LazySeg(const std::vector<T>& a) : n((int)a.size()), s(4 * (a.size() + 1)), lz(4 * (a.size() + 1)) {
    if (n) build(a, 1, 0, n);
  }
  void build(const std::vector<T>& a, int o, int lo, int hi) {
    if (hi - lo == 1) { s[o] = a[lo]; return; }
    int m = lo + (hi - lo) / 2;
    build(a, 2 * o, lo, m); build(a, 2 * o + 1, m, hi);
    s[o] = s[2 * o] + s[2 * o + 1];
  }
  void ap(int o, int lo, int hi, T v) { s[o] += v * (hi - lo); lz[o] += v; }
  void push(int o, int lo, int hi) {
    if (lz[o] == 0) return;
    int m = lo + (hi - lo) / 2;
    ap(2 * o, lo, m, lz[o]); ap(2 * o + 1, m, hi, lz[o]); lz[o] = 0;
  }
  void add(int l, int r, T v) { if (l < r) add(1, 0, n, l, r, v); }
  void add(int o, int lo, int hi, int l, int r, T v) {
    if (r <= lo || hi <= l) return;
    if (l <= lo && hi <= r) { ap(o, lo, hi, v); return; }
    push(o, lo, hi);
    int m = lo + (hi - lo) / 2;
    add(2 * o, lo, m, l, r, v); add(2 * o + 1, m, hi, l, r, v);
    s[o] = s[2 * o] + s[2 * o + 1];
  }
  T sum(int l, int r) { return l < r ? sum(1, 0, n, l, r) : T(0); }
  T sum(int o, int lo, int hi, int l, int r) {
    if (r <= lo || hi <= l) return 0;
    if (l <= lo && hi <= r) return s[o];
    push(o, lo, hi);
    int m = lo + (hi - lo) / 2;
    return sum(2 * o, lo, m, l, r) + sum(2 * o + 1, m, hi, l, r);
  }
};

