
// ---- example main (stdin/stdout) — protocol follows Library Checker "Union Find":
// first line: N Q; then Q lines "t u v": t=0 unite(u,v); t=1 print 1 if same(u,v) else 0.
#include <cstdio>
int main() {
  int n, q;
  if (std::scanf("%d %d", &n, &q) != 2) return 0;
  DSU d(n);
  while (q--) {
    int t, u, v;
    std::scanf("%d %d %d", &t, &u, &v);
    if (t == 0) d.unite(u, v);
    else std::printf("%d\n", d.same(u, v) ? 1 : 0);
  }
  return 0;
}
