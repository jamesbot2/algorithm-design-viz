package main

// Number theory toolkit. Preconditions: Gcd/ExGcd take a, b >= 0; PowMod takes base >= 0, power >= 0, m >= 1; InvMod takes any a, m >= 1.

// Gcd is Euclid: gcd(a, 0) = a.
func Gcd(a, b int64) int64 {
	for b != 0 { a, b = b, a%b } // @a: nGcdStep
	return a // @a: nGcdRet
}

// ExGcd is extended Euclid: returns [g, x, y] with a*x + b*y = g = gcd(a, b).
func ExGcd(a, b int64) []int64 {
	r0, r1, s0, s1, t0, t1 := a, b, int64(1), int64(0), int64(0), int64(1) // @a: nExInit
	for r1 != 0 { // @a: nExStep+4
		q := r0 / r1
		r0, r1 = r1, r0-q*r1
		s0, s1 = s1, s0-q*s1
		t0, t1 = t1, t0-q*t1
	}
	return []int64{r0, s0, t0} // @a: nExRet
}

// PowMod is fast power: base^power mod m by scanning the bits of power.
func PowMod(base, power, m int64) int64 {
	result := 1 % m // @a: nPowInit
	base %= m
	for power > 0 {
		if power&1 == 1 { result = result * base % m } // @a: nPowBit
		base = base * base % m // @a: nPowSquare
		power >>= 1
	}
	return result // @a: nPowRet
}

// InvMod is the modular inverse of a mod m via ExGcd; -1 when gcd(a, m) != 1 (no inverse exists).
func InvMod(a, m int64) int64 {
	e := ExGcd(((a%m)+m)%m, m) // @a: nInvEx
	if e[0] != 1 { return -1 } // @a: nInvNone
	return ((e[1] % m) + m) % m // @a: nInvRet
}

// Sieve is the sieve of Eratosthenes: all primes <= n in increasing order.
func Sieve(n int64) []int64 {
	composite := make([]bool, n+1) // @a: nSieveInit
	primes := []int64{}
	for i := int64(2); i <= n; i++ {
		if composite[i] { continue } // @a: nSieveSkip
		primes = append(primes, i) // @a: nSievePrime
		for j := i * i; j <= n; j += i { composite[j] = true } // @a: nSieveMark
	}
	return primes // @a: nSieveRet
}
