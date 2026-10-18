// ---- example main (stdin/stdout): first line N K; second line a_1..a_N (all > 0). Print the minimal possible largest part sum.
#include <cstdio>
int main() {
  int n;
  long long k;
  if (std::scanf("%d %lld", &n, &k) != 2) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  std::printf("%lld\n", min_largest(a, k));
  return 0;
}
