// DSU (disjoint set union) — contest version.
// Elements 0..n-1. Union by size + path compression: amortized O(alpha(n)) per op, O(n) memory.
// find() recurses; with union by size the tree depth is <= log2(n), so recursion is safe.
// C++17, headers <utility> <vector>. Interface: find(x), unite(a,b) -> merged?, same(a,b), size_of(x).
#include <utility>
#include <vector>
struct DSU {
  std::vector<int> p;  // p[x] < 0: x is a root and -p[x] is its set size; otherwise parent
  explicit DSU(int n = 0) : p(n, -1) {}
  int find(int x) { return p[x] < 0 ? x : p[x] = find(p[x]); }
  bool unite(int a, int b) {
    a = find(a), b = find(b);
    if (a == b) return false;
    if (p[a] > p[b]) std::swap(a, b);  // a is the larger tree
    p[a] += p[b], p[b] = a;
    return true;
  }
  bool same(int a, int b) { return find(a) == find(b); }
  int size_of(int x) { return -p[find(x)]; }
};
