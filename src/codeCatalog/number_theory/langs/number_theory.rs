// Number theory toolkit. Preconditions: gcd/ex_gcd take a, b >= 0; pow_mod takes base >= 0, power >= 0, m >= 1; inv_mod takes any a, m >= 1.

/// Euclid: gcd(a, 0) = a.
pub fn gcd(mut a: i64, mut b: i64) -> i64 {
    while b != 0 { let t = a % b; a = b; b = t; } // @a: nGcdStep
    a // @a: nGcdRet
}

/// Extended Euclid: returns [g, x, y] with a*x + b*y = g = gcd(a, b).
pub fn ex_gcd(a: i64, b: i64) -> [i64; 3] {
    let (mut r0, mut r1, mut s0, mut s1, mut t0, mut t1) = (a, b, 1i64, 0i64, 0i64, 1i64); // @a: nExInit
    while r1 != 0 { // @a: nExStep+4
        let q = r0 / r1;
        (r0, r1) = (r1, r0 - q * r1);
        (s0, s1) = (s1, s0 - q * s1);
        (t0, t1) = (t1, t0 - q * t1);
    }
    [r0, s0, t0] // @a: nExRet
}

/// Fast power: base^power mod m by scanning the bits of power.
pub fn pow_mod(mut base: i64, mut power: i64, m: i64) -> i64 {
    let mut result = 1 % m; // @a: nPowInit
    base %= m;
    while power > 0 {
        if power & 1 == 1 { result = result * base % m; } // @a: nPowBit
        base = base * base % m; // @a: nPowSquare
        power >>= 1;
    }
    result // @a: nPowRet
}

/// Modular inverse of a mod m via ex_gcd; -1 when gcd(a, m) != 1 (no inverse exists).
pub fn inv_mod(a: i64, m: i64) -> i64 {
    let e = ex_gcd(((a % m) + m) % m, m); // @a: nInvEx
    if e[0] != 1 { return -1; } // @a: nInvNone
    ((e[1] % m) + m) % m // @a: nInvRet
}

/// Sieve of Eratosthenes: all primes <= n in increasing order.
pub fn sieve(n: i64) -> Vec<i64> {
    let n = n as usize;
    let mut composite = vec![false; n + 1]; // @a: nSieveInit
    let mut primes: Vec<i64> = Vec::new();
    for i in 2..=n {
        if composite[i] { continue; } // @a: nSieveSkip
        primes.push(i as i64); // @a: nSievePrime
        let mut j = i * i;
        while j <= n { composite[j] = true; j += i; } // @a: nSieveMark
    }
    primes // @a: nSieveRet
}
