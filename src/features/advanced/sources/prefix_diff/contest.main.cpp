// ---- example main (stdin/stdout): first line N U Q; second line a_0..a_{N-1};
// then U lines "l r x" (a[l..r) += x), then Q lines "l r" (print sum of a[l..r) AFTER all updates).
#include <cstdio>
int main() {
  int n, u, q;
  if (std::scanf("%d %d %d", &n, &u, &q) != 3) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  Diff<long long> d(n);
  while (u--) {
    int l, r;
    long long x;
    std::scanf("%d %d %lld", &l, &r, &x);
    d.add(l, r, x);
  }
  Prefix<long long> p(d.apply(a));
  while (q--) {
    int l, r;
    std::scanf("%d %d", &l, &r);
    std::printf("%lld\n", p.sum(l, r));
  }
  return 0;
}
