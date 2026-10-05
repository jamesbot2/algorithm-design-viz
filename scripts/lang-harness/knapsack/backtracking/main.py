import sys
from algo import knapsack_backtracking
lines = sys.stdin.read().split("\n")
W = int(lines[0])
w = [int(x) for x in lines[1].split()]
vals = [int(x) for x in lines[2].split()]
print(knapsack_backtracking(w, vals, W))
