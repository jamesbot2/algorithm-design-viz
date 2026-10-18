// ---- example main (stdin/stdout): first line N Q; second line a_0..a_{N-1}; third line q_1..q_Q.
// Output: line 1 = rank of every a_i; line 2 = for each q, how many distinct values of a are < q.
#include <cstdio>
int main() {
  int n, q;
  if (std::scanf("%d %d", &n, &q) != 2) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  Compress<long long> c(a);
  for (int i = 0; i < n; i++) std::printf(i ? " %d" : "%d", c.id(a[i]));
  std::printf("\n");
  for (int i = 0; i < q; i++) {
    long long x;
    std::scanf("%lld", &x);
    std::printf(i ? " %d" : "%d", c.id(x));
  }
  std::printf("\n");
  return 0;
}
