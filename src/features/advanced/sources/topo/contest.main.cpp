// ---- example main (stdin/stdout): first line N M; then M lines "u v" (edge u -> v, nodes 0..N-1).
// Output: line 1 = 1 if acyclic else 0; line 2 = the processed nodes in order (all N nodes when acyclic).
#include <cstdio>
int main() {
  int n, m;
  if (std::scanf("%d %d", &n, &m) != 2) return 0;
  std::vector<std::pair<int, int>> e(m);
  for (auto& [u, v] : e) std::scanf("%d %d", &u, &v);
  std::vector<int> o = topo_order(n, e);
  std::printf("%d\n", (int)o.size() == n ? 1 : 0);
  for (size_t i = 0; i < o.size(); i++) std::printf(i ? " %d" : "%d", o[i]);
  std::printf("\n");
  return 0;
}
