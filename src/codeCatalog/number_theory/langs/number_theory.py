"""Number theory toolkit. Preconditions: gcd/ex_gcd take a, b >= 0; pow_mod takes base >= 0, power >= 0, m >= 1; inv_mod takes any a, m >= 1."""


def gcd(a: int, b: int) -> int:
    """Euclid: gcd(a, 0) = a."""
    while b != 0:
        a, b = b, a % b  # @a: nGcdStep
    return a  # @a: nGcdRet


def ex_gcd(a: int, b: int) -> list[int]:
    """Extended Euclid: returns [g, x, y] with a*x + b*y = g = gcd(a, b)."""
    r0, r1, s0, s1, t0, t1 = a, b, 1, 0, 0, 1  # @a: nExInit
    while r1 != 0:
        q = r0 // r1  # @a: nExStep+3
        r0, r1 = r1, r0 - q * r1
        s0, s1 = s1, s0 - q * s1
        t0, t1 = t1, t0 - q * t1
    return [r0, s0, t0]  # @a: nExRet


def pow_mod(base: int, power: int, m: int) -> int:
    """Fast power: base**power mod m by scanning the bits of power."""
    result = 1 % m  # @a: nPowInit
    base %= m
    while power > 0:
        if power & 1:
            result = result * base % m  # @a: nPowBit
        base = base * base % m  # @a: nPowSquare
        power >>= 1
    return result  # @a: nPowRet


def inv_mod(a: int, m: int) -> int:
    """Modular inverse of a mod m via ex_gcd; -1 when gcd(a, m) != 1 (no inverse exists)."""
    g, x, _ = ex_gcd(a % m, m)  # @a: nInvEx
    if g != 1:
        return -1  # @a: nInvNone
    return x % m  # @a: nInvRet


def sieve(n: int) -> list[int]:
    """Sieve of Eratosthenes: all primes <= n in increasing order."""
    composite = [False] * (n + 1)  # @a: nSieveInit
    primes: list[int] = []
    for i in range(2, n + 1):
        if composite[i]:
            continue  # @a: nSieveSkip
        primes.append(i)  # @a: nSievePrime
        for j in range(i * i, n + 1, i):
            composite[j] = True  # @a: nSieveMark
    return primes  # @a: nSieveRet
