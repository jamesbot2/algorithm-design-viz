import sys
from algo import prim
lines = sys.stdin.read().strip().split("\n")
n, start = map(int, lines[0].split())
adj: list[list[tuple[int, float]]] = [[] for _ in range(n)]
for ln in lines[1:]:
    u, v, w = map(int, ln.split())
    adj[u].append((v, w))
    adj[v].append((u, w))
total, parent = prim(n, adj, start)
print(int(total))
print(" ".join(sorted(f"{min(p, v)}-{max(p, v)}" for v, p in enumerate(parent) if p >= 0)))
