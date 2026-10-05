import sys
from algo import matrix_chain_order
d = [int(x) for x in sys.stdin.read().split()]
cost, split = matrix_chain_order(d)


def paren(i: int, j: int) -> str:
    return f"A{i + 1}" if i == j else f"({paren(i, split[i][j])}{paren(split[i][j] + 1, j)})"


print(cost)
print(paren(0, len(d) - 2))
