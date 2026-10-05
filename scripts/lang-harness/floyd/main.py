import sys
from algo import floyd, INF
tok = sys.stdin.read().split()
n = int(tok[0])
vals = [INF if t == "INF" else float(t) for t in tok[1:1 + n * n]]
d = floyd([vals[r * n:(r + 1) * n] for r in range(n)])
for row in d:
    print(" ".join("INF" if x == INF else str(int(x)) for x in row))
