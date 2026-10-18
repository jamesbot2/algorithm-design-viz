#include <vector>

// Kahn's topological sort. Returns {status, order...}: status 1 = acyclic (order has n nodes), 0 = cycle (order = nodes processed before it blocked).
std::vector<long long> topo_sort(long long n, const std::vector<long long>& edges) {
  std::vector<std::vector<int>> adj(n);
  std::vector<int> indeg(n, 0);
  for (size_t i = 0; i + 1 < edges.size(); i += 2) {
    adj[edges[i]].push_back((int)edges[i + 1]);  // @a: tsBuild+1
    indeg[edges[i + 1]]++;
  }
  std::vector<int> queue;
  for (int v = 0; v < n; v++) if (indeg[v] == 0) queue.push_back(v);  // @a: tsSeed
  std::vector<long long> order;
  for (size_t head = 0; head < queue.size(); head++) {
    int u = queue[head];  // @a: tsPop
    order.push_back(u);
    for (int v : adj[u]) {
      indeg[v]--;  // @a: tsRelax
      if (indeg[v] == 0) queue.push_back(v);  // @a: tsEnqueue
    }
  }
  std::vector<long long> res{order.size() == (size_t)n ? 1LL : 0LL};
  res.insert(res.end(), order.begin(), order.end());  // @a: tsResult
  return res;
}
