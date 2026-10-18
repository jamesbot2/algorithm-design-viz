#include <vector>

// Number theory toolkit. Preconditions: gcd_ll/ex_gcd take a, b >= 0; pow_mod takes base >= 0, power >= 0, m >= 1; inv_mod takes any a, m >= 1.
// long long products stay exact while m <= 3·10^9.

// Euclid: gcd(a, 0) = a.
long long gcd_ll(long long a, long long b) {
  while (b != 0) { long long t = a % b; a = b; b = t; }  // @a: nGcdStep
  return a;  // @a: nGcdRet
}

// Extended Euclid: returns {g, x, y} with a*x + b*y = g = gcd(a, b).
std::vector<long long> ex_gcd(long long a, long long b) {
  long long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1;  // @a: nExInit
  while (r1 != 0) {  // @a: nExStep+4
    long long q = r0 / r1, t;
    t = r0 - q * r1; r0 = r1; r1 = t;
    t = s0 - q * s1; s0 = s1; s1 = t;
    t = t0 - q * t1; t0 = t1; t1 = t;
  }
  return {r0, s0, t0};  // @a: nExRet
}

// Fast power: base^power mod m by scanning the bits of power.
long long pow_mod(long long base, long long power, long long m) {
  long long result = 1 % m;  // @a: nPowInit
  base %= m;
  while (power > 0) {
    if (power & 1) result = result * base % m;  // @a: nPowBit
    base = base * base % m;  // @a: nPowSquare
    power >>= 1;
  }
  return result;  // @a: nPowRet
}

// Modular inverse of a mod m via ex_gcd; -1 when gcd(a, m) != 1 (no inverse exists).
long long inv_mod(long long a, long long m) {
  std::vector<long long> e = ex_gcd(((a % m) + m) % m, m);  // @a: nInvEx
  if (e[0] != 1) return -1;  // @a: nInvNone
  return ((e[1] % m) + m) % m;  // @a: nInvRet
}

// Sieve of Eratosthenes: all primes <= n in increasing order.
std::vector<long long> sieve(long long n) {
  std::vector<bool> composite(n + 1, false);  // @a: nSieveInit
  std::vector<long long> primes;
  for (long long i = 2; i <= n; i++) {
    if (composite[i]) continue;  // @a: nSieveSkip
    primes.push_back(i);  // @a: nSievePrime
    for (long long j = i * i; j <= n; j += i) composite[j] = true;  // @a: nSieveMark
  }
  return primes;  // @a: nSieveRet
}
