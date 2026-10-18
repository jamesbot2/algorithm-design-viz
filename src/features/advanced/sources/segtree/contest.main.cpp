
// ---- example main (stdin/stdout) — protocol follows Library Checker "Point Add Range Sum", with assignment:
// first line: N Q; second line: a_0..a_{N-1}; then Q lines: "0 p x" a[p] = x; "1 l r" print sum a[l..r).
#include <cstdio>
int main() {
  int n, q;
  if (std::scanf("%d %d", &n, &q) != 2) return 0;
  SegTree<long long> st(n);
  for (int i = 0; i < n; i++) {
    long long x;
    std::scanf("%lld", &x);
    st.set(i, x);
  }
  while (q--) {
    int t;
    std::scanf("%d", &t);
    if (t == 0) {
      int p;
      long long x;
      std::scanf("%d %lld", &p, &x);
      st.set(p, x);
    } else {
      int l, r;
      std::scanf("%d %d", &l, &r);
      std::printf("%lld\n", st.sum(l, r));
    }
  }
  return 0;
}
