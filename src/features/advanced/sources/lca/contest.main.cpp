// ---- example main (stdin/stdout): first line N Q; then N-1 integers par[1..N-1] (par[v] < v); then Q lines "u v".
// Output: Q lines, the LCA of each pair.
#include <cstdio>
int main() {
  int n, q;
  if (std::scanf("%d %d", &n, &q) != 2) return 0;
  std::vector<int> par(n, 0);
  for (int v = 1; v < n; v++) std::scanf("%d", &par[v]);
  LCA t(par);
  while (q--) {
    int u, v;
    std::scanf("%d %d", &u, &v);
    std::printf("%d\n", t.query(u, v));
  }
  return 0;
}
