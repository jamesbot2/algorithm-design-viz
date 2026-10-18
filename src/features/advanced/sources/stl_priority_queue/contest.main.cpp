
// ---- example main (stdin/stdout): line 1: n; line 2: n ints. Prints them in non-increasing order, space separated.
#include <cstdio>
int main() {
  int n;
  if (std::scanf("%d", &n) != 1) return 0;
  std::vector<int> v(n);
  for (int& x : v) std::scanf("%d", &x);
  std::vector<int> r = drain_desc(v);
  for (int i = 0; i < n; i++) std::printf("%d%c", r[i], i + 1 < n ? ' ' : '\n');
  return 0;
}
