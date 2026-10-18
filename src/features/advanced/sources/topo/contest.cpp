// Kahn's algorithm — contest version. topo_order(n, edges) returns the nodes processed in FIFO order.
// order.size() == n  <=>  the graph is acyclic (a smaller size means a cycle blocked the rest).
// Deterministic: initial zero-indegree nodes in increasing index, out-edges in input order. O(n + m).
// C++17, header <vector>.
#include <utility>
#include <vector>
std::vector<int> topo_order(int n, const std::vector<std::pair<int, int>>& edges) {
  std::vector<std::vector<int>> g(n);
  std::vector<int> indeg(n), q;
  for (auto [u, v] : edges) g[u].push_back(v), indeg[v]++;
  for (int v = 0; v < n; v++) if (!indeg[v]) q.push_back(v);
  for (size_t h = 0; h < q.size(); h++)
    for (int v : g[q[h]]) if (--indeg[v] == 0) q.push_back(v);
  return q;
}

