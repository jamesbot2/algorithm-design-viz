// Number theory — contest version. Preconditions: gcd_ll/ex_gcd take a, b >= 0; pow_mod takes base >= 0, power >= 0, m >= 1;
// inv_mod takes any a and m >= 1 (returns -1 when gcd(a, m) != 1). Products stay exact while m <= 3·10^9.
// ex_gcd(a, b, x, y) returns g and sets a*x + b*y = g. sieve(n) returns all primes <= n. C++17, header <vector>.
#include <vector>
long long gcd_ll(long long a, long long b) { while (b) { long long t = a % b; a = b; b = t; } return a; }
long long ex_gcd(long long a, long long b, long long& x, long long& y) {
  long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;
  while (r1) {
    long long q = r0 / r1, t;
    t = r0 - q * r1; r0 = r1; r1 = t;
    t = s0 - q * s1; s0 = s1; s1 = t;
    t = t0 - q * t1; t0 = t1; t1 = t;
  }
  x = s0, y = t0;
  return r0;
}
long long pow_mod(long long b, long long e, long long m) {
  long long r = 1 % m;
  b %= m;
  for (; e > 0; e >>= 1, b = b * b % m) if (e & 1) r = r * b % m;
  return r;
}
long long inv_mod(long long a, long long m) {
  long long x, y;
  if (ex_gcd(((a % m) + m) % m, m, x, y) != 1) return -1;
  return ((x % m) + m) % m;
}
std::vector<int> sieve(int n) {
  std::vector<bool> comp(n + 1);
  std::vector<int> p;
  for (int i = 2; i <= n; i++) {
    if (comp[i]) continue;
    p.push_back(i);
    for (long long j = (long long)i * i; j <= n; j += i) comp[j] = true;
  }
  return p;
}

