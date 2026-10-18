#include <utility>
#include <vector>

// DSU (union by size + path compression), teaching version. Elements are 0..n-1.
struct DSU {
  std::vector<int> parent, size;
  int count;  // number of disjoint sets

  explicit DSU(int n) : parent(n), size(n, 1), count(n) {
    for (int i = 0; i < n; i++) parent[i] = i;  // @a: init
  }

  // Root of x; afterwards every node on the path points directly at the root.
  int find(int x) {
    int root = x;  // @a: findStart
    while (parent[root] != root) {  // @a: findClimb+2
      root = parent[root];
    }
    while (parent[x] != root) {  // @a: compress+4
      int next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;  // @a: findReturn
  }

  // Merge the sets of a and b. Returns true if they were different sets.
  bool unite(int a, int b) {
    int ra = find(a), rb = find(b);  // @a: unionFind
    if (ra == rb) return false;  // @a: unionSame
    if (size[ra] < size[rb]) std::swap(ra, rb);  // @a: unionSwap
    parent[rb] = ra;  // @a: unionLink+2
    size[ra] += size[rb];
    count--;
    return true;  // @a: unionDone
  }

  bool same(int a, int b) {
    return find(a) == find(b);  // @a: sameCompare
  }
};
