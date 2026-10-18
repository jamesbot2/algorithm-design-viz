#include <vector>

// Segment tree (point assign + range sum), teaching version.
// Public API: 0-based indices, half-open ranges [l, r). Node 1 is the root; children are 2*node and 2*node+1.
struct SegTree {
  int n;
  std::vector<long long> tree;  // tree[node] = sum of a[lo, hi)

  explicit SegTree(const std::vector<long long>& a) : n((int)a.size()), tree(4 * (a.empty() ? 1 : a.size()), 0) {
    if (n > 0) build(a, 1, 0, n);  // @a: buildCall
  }

  void build(const std::vector<long long>& a, int node, int lo, int hi) {
    if (hi - lo == 1) {
      tree[node] = a[lo];  // @a: buildLeaf
      return;
    }
    int mid = lo + (hi - lo) / 2;
    build(a, 2 * node, lo, mid);
    build(a, 2 * node + 1, mid, hi);
    tree[node] = tree[2 * node] + tree[2 * node + 1];  // @a: buildPull
  }

  // a[i] = v
  void set(int i, long long v) {
    set_rec(1, 0, n, i, v);  // @a: setCall
  }

  void set_rec(int node, int lo, int hi, int i, long long v) {
    if (hi - lo == 1) {
      tree[node] = v;  // @a: setLeaf
      return;
    }
    int mid = lo + (hi - lo) / 2;
    if (i < mid) set_rec(2 * node, lo, mid, i, v);  // @a: setDescend+1
    else set_rec(2 * node + 1, mid, hi, i, v);
    tree[node] = tree[2 * node] + tree[2 * node + 1];  // @a: setPull
  }

  // Sum of a[l..r).
  long long sum(int l, int r) const {
    return query(1, 0, n, l, r);  // @a: sumCall
  }

  long long query(int node, int lo, int hi, int l, int r) const {
    if (r <= lo || hi <= l) return 0;  // @a: queryOutside
    if (l <= lo && hi <= r) return tree[node];  // @a: queryInside
    int mid = lo + (hi - lo) / 2;
    return query(2 * node, lo, mid, l, r) + query(2 * node + 1, mid, hi, l, r);  // @a: querySplit
  }
};
