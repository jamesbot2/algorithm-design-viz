import sys
from algo import knapsack_branch_and_bound
lines = sys.stdin.read().split("\n")
W = int(lines[0])
w = [int(x) for x in lines[1].split()]
vals = [int(x) for x in lines[2].split()]
print(knapsack_branch_and_bound(w, vals, W))
