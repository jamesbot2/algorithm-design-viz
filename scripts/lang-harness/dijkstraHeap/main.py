import math
import sys
from algo import dijkstra_heap
lines = sys.stdin.read().strip().split("\n")
n, start = map(int, lines[0].split())
adj: list[list[tuple[int, float]]] = [[] for _ in range(n)]
for ln in lines[1:]:
    u, v, w = map(int, ln.split())
    adj[u].append((v, w))
dist, parent = dijkstra_heap(n, start, adj)
print(" ".join("INF" if math.isinf(x) else str(int(x)) for x in dist))
print(" ".join(map(str, parent)))
