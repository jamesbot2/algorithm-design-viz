// ---- example main (stdin/stdout): first line N K (1 <= K <= N); second line a_0..a_{N-1}.
// Output: line 1 = maximum of every window of length K; line 2 = minimum of every window.
#include <cstdio>
int main() {
  int n, k;
  if (std::scanf("%d %d", &n, &k) != 2) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  std::vector<long long> mx = window_max(a, k), mn = window_min(a, k);
  for (size_t i = 0; i < mx.size(); i++) std::printf(i ? " %lld" : "%lld", mx[i]);
  std::printf("\n");
  for (size_t i = 0; i < mn.size(); i++) std::printf(i ? " %lld" : "%lld", mn[i]);
  std::printf("\n");
  return 0;
}
