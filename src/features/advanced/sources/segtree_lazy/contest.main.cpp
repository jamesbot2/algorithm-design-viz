// ---- example main (stdin/stdout): first line N Q; second line a_0..a_{N-1}; then Q lines:
// "0 l r x" a[l..r) += x ; "1 l r" print sum a[l..r).
#include <cstdio>
int main() {
  int n, q;
  if (std::scanf("%d %d", &n, &q) != 2) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  LazySeg<long long> st(a);
  while (q--) {
    int t, l, r;
    std::scanf("%d %d %d", &t, &l, &r);
    if (t == 0) {
      long long x;
      std::scanf("%lld", &x);
      st.add(l, r, x);
    } else {
      std::printf("%lld\n", st.sum(l, r));
    }
  }
  return 0;
}
