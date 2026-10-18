#include <utility>
#include <vector>

// LCA by binary lifting. par[v-1] = parent of node v (1..n-1), must satisfy par[v-1] < v; node 0 is the root. queries = flat pairs (u v).
std::vector<long long> lca_all(const std::vector<long long>& par, const std::vector<long long>& queries) {
  int n = (int)par.size() + 1;
  int LOG = 1;
  while ((1 << LOG) < n) LOG++;
  std::vector<int> depth(n, 0);
  for (int v = 1; v < n; v++) depth[v] = depth[par[v - 1]] + 1;  // @a: lcaDepth
  std::vector<std::vector<int>> up(LOG, std::vector<int>(n, 0));
  for (int v = 1; v < n; v++) up[0][v] = (int)par[v - 1];  // @a: lcaBase
  for (int j = 1; j < LOG; j++)
    for (int v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];  // @a: lcaTable
  std::vector<long long> out;
  for (size_t q = 0; q + 1 < queries.size(); q += 2) {
    int u = (int)queries[q], v = (int)queries[q + 1];
    if (depth[u] < depth[v]) std::swap(u, v);
    int diff = depth[u] - depth[v];
    for (int j = 0; j < LOG; j++) {
      if ((diff >> j) & 1) u = up[j][u];  // @a: lcaLift
    }
    if (u != v) {
      for (int j = LOG - 1; j >= 0; j--) {
        if (up[j][u] != up[j][v]) { u = up[j][u]; v = up[j][v]; }  // @a: lcaJump
      }
      u = up[0][u];  // @a: lcaParent
    }
    out.push_back(u);  // @a: lcaAnswer
  }
  return out;
}
