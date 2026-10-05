import math
import sys
from algo import Edge, bellman_ford
lines = sys.stdin.read().strip().split("\n")
h = lines[0].split()
n, start, mode = int(h[0]), int(h[1]), h[2]
edges = [Edge(*map(int, ln.split())) for ln in lines[1:]]
dist, parent, neg = bellman_ford(n, edges, start)
if mode == "full":
    print(" ".join("INF" if math.isinf(x) else str(int(x)) for x in dist))
    print(" ".join(map(str, parent)))
print("true" if neg else "false")
