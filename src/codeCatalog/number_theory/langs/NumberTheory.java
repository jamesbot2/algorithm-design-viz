/** Number theory toolkit. Preconditions: gcd/exGcd take a, b >= 0; powMod takes base >= 0, power >= 0, m >= 1; invMod takes any a, m >= 1. */
public class NumberTheory {
    /** Euclid: gcd(a, 0) = a. */
    static long gcd(long a, long b) {
        while (b != 0) { long t = a % b; a = b; b = t; } // @a: nGcdStep
        return a; // @a: nGcdRet
    }

    /** Extended Euclid: returns [g, x, y] with a*x + b*y = g = gcd(a, b). */
    static long[] exGcd(long a, long b) {
        long r0 = a, r1 = b, s0 = 1, s1 = 0, t0 = 0, t1 = 1; // @a: nExInit
        while (r1 != 0) { // @a: nExStep+4
            long q = r0 / r1, t;
            t = r0 - q * r1; r0 = r1; r1 = t;
            t = s0 - q * s1; s0 = s1; s1 = t;
            t = t0 - q * t1; t0 = t1; t1 = t;
        }
        return new long[] {r0, s0, t0}; // @a: nExRet
    }

    /** Fast power: base^power mod m by scanning the bits of power. */
    static long powMod(long base, long power, long m) {
        long result = 1 % m; // @a: nPowInit
        base %= m;
        while (power > 0) {
            if ((power & 1) == 1) result = result * base % m; // @a: nPowBit
            base = base * base % m; // @a: nPowSquare
            power >>= 1;
        }
        return result; // @a: nPowRet
    }

    /** Modular inverse of a mod m via exGcd; -1 when gcd(a, m) != 1 (no inverse exists). */
    static long invMod(long a, long m) {
        long[] e = exGcd(((a % m) + m) % m, m); // @a: nInvEx
        if (e[0] != 1) return -1; // @a: nInvNone
        return ((e[1] % m) + m) % m; // @a: nInvRet
    }

    /** Sieve of Eratosthenes: all primes <= n in increasing order. */
    static long[] sieve(long nn) {
        int n = (int) nn;
        boolean[] composite = new boolean[n + 1]; // @a: nSieveInit
        long[] primes = new long[n + 1];
        int cnt = 0;
        for (int i = 2; i <= n; i++) {
            if (composite[i]) continue; // @a: nSieveSkip
            primes[cnt++] = i; // @a: nSievePrime
            for (long j = (long) i * i; j <= n; j += i) composite[(int) j] = true; // @a: nSieveMark
        }
        return java.util.Arrays.copyOf(primes, cnt); // @a: nSieveRet
    }
}
