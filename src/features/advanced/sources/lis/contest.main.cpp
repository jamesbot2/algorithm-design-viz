// ---- example main (stdin/stdout): first line N; second line N integers.
// Output: line 1 = LIS length; line 2 = one longest strictly increasing subsequence.
#include <cstdio>
int main() {
  int n;
  if (std::scanf("%d", &n) != 1) return 0;
  std::vector<long long> a(n);
  for (auto& x : a) std::scanf("%lld", &x);
  std::vector<long long> s = lis_strict(a);
  std::printf("%d\n", (int)s.size());
  for (size_t i = 0; i < s.size(); i++) std::printf(i ? " %lld" : "%lld", s[i]);
  std::printf("\n");
  return 0;
}
