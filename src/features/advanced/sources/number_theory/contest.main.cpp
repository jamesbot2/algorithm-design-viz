// ---- example main (stdin/stdout): one line "a b power m n" (a >= 0, b >= 1, power >= 0, m >= 1, n >= 0).
// Output (5 lines): gcd(a,b); "g x y" from ex_gcd(a,b); a^power mod m; inverse of a mod b (or -1); primes <= n (space separated, empty line if none).
#include <cstdio>
int main() {
  long long a, b, p, m;
  int n;
  if (std::scanf("%lld %lld %lld %lld %d", &a, &b, &p, &m, &n) != 5) return 0;
  long long x, y, g = ex_gcd(a, b, x, y);
  std::printf("%lld\n%lld %lld %lld\n%lld\n%lld\n", gcd_ll(a, b), g, x, y, pow_mod(a, p, m), inv_mod(a, b));
  std::vector<int> pr = sieve(n);
  for (size_t i = 0; i < pr.size(); i++) std::printf(i ? " %d" : "%d", pr[i]);
  std::printf("\n");
  return 0;
}
