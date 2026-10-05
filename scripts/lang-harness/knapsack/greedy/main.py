import sys
from algo import knapsack_greedy_by_density
lines = sys.stdin.read().split("\n")
W = int(lines[0])
w = [int(x) for x in lines[1].split()]
vals = [int(x) for x in lines[2].split()]
v, sel = knapsack_greedy_by_density(w, vals, W)
print(v)
print(" ".join(map(str, sel)))
