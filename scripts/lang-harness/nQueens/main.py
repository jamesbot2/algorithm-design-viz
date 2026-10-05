import sys
from algo import solve_n_queens
s = solve_n_queens(int(sys.stdin.read().split()[0]))
print(len(s))
for x in s:
    print(" ".join(map(str, x)))
