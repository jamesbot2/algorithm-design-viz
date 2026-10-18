// LCA by binary lifting — contest version. LCA(par): par[v] = parent of v with par[v] < v for v >= 1, par[0] = 0 (root).
// query(u, v) = lowest common ancestor; a node counts as its own ancestor. Build O(n log n), query O(log n).
// For an arbitrary rooted tree (parent not smaller than child) compute `depth` with a BFS/DFS first. C++17, header <vector>.
#include <utility>
#include <vector>
struct LCA {
  int LOG = 1;
  std::vector<int> depth;
  std::vector<std::vector<int>> up;
  explicit LCA(const std::vector<int>& par) {
    int n = (int)par.size();
    while ((1 << LOG) < n) LOG++;
    depth.assign(n, 0);
    up.assign(LOG, std::vector<int>(n, 0));
    for (int v = 1; v < n; v++) depth[v] = depth[par[v]] + 1, up[0][v] = par[v];
    for (int j = 1; j < LOG; j++)
      for (int v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
  }
  int query(int u, int v) const {
    if (depth[u] < depth[v]) std::swap(u, v);
    for (int j = 0; j < LOG; j++)
      if (((depth[u] - depth[v]) >> j) & 1) u = up[j][u];
    if (u == v) return u;
    for (int j = LOG - 1; j >= 0; j--)
      if (up[j][u] != up[j][v]) u = up[j][u], v = up[j][v];
    return up[0][u];
  }
};

