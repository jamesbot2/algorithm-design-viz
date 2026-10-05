import sys
from algo import kadane
a = [int(x) for x in sys.stdin.read().split()]
r = kadane(a)
print("null" if r is None else f"{r[0]} {r[1]} {r[2]}")
