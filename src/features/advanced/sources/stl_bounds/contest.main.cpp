
// ---- example main (stdin/stdout): line 1: n; line 2: n sorted ints; line 3: q; then q ints x.
// For each x print "first_ge first_gt count_equal" on one line.
#include <cstdio>
int main() {
  int n;
  if (std::scanf("%d", &n) != 1) return 0;
  std::vector<int> v(n);
  for (int& x : v) std::scanf("%d", &x);
  int q;
  std::scanf("%d", &q);
  while (q--) {
    int x;
    std::scanf("%d", &x);
    std::printf("%d %d %lld\n", first_ge(v, x), first_gt(v, x), count_equal(v, x));
  }
  return 0;
}
