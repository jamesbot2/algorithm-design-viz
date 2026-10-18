// ---- example main (stdin/stdout): first line N; second line a_0..a_{N-1} (non-negative).
// Output: line 1 = next strictly greater index of each element (-1 if none); line 2 = largest histogram rectangle.
#include <cstdio>
int main() {
  int n;
  if (std::scanf("%d", &n) != 1) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  std::vector<int> g = next_greater(a);
  for (int i = 0; i < n; i++) std::printf(i ? " %d" : "%d", g[i]);
  std::printf("\n%lld\n", largest_rect(a));
  return 0;
}
