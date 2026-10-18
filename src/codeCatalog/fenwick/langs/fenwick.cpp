#include <vector>

// Fenwick tree (binary indexed tree), teaching version.
// Public API: 0-based indices, half-open ranges [l, r). Internally T is 1-based:
// T[i] stores the sum over (i - lowbit(i), i] (1-based terms).
struct Fenwick {
  int n;
  std::vector<long long> tree;  // tree[0] is unused

  explicit Fenwick(int n) : n(n), tree(n + 1, 0) {  // @a: init
  }

  // a[i] += delta (i is 0-based).
  void add(int i, long long delta) {
    int p = i + 1;  // @a: addStart
    while (p <= n) {
      tree[p] += delta;  // @a: addApply
      p += p & -p;  // @a: addNext
    }
  }

  // Sum of a[0..r).
  long long prefix(int r) const {
    long long sum = 0; // @a: prefixStart+1
    int p = r;
    while (p > 0) {
      sum += tree[p];  // @a: prefixAccum
      p -= p & -p;  // @a: prefixNext
    }
    return sum;  // @a: prefixReturn
  }

  // Sum of a[l..r).
  long long range(int l, int r) const {
    return prefix(r) - prefix(l);  // @a: rangeCompute
  }
};
