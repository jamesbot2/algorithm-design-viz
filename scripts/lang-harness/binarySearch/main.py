import sys
from algo import binary_search
lines = sys.stdin.read().split("\n")
t = int(lines[0])
a = [int(x) for x in lines[1].split()]
print(binary_search(a, t))
