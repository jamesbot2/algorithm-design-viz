import sys
from algo import knapsack_dp2d
l = sys.stdin.read().split("\n")
print(knapsack_dp2d([int(x) for x in l[1].split()], [int(x) for x in l[2].split()], int(l[0]))[0])
