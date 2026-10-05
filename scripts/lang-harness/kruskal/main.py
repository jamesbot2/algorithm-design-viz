import sys
from algo import Edge, kruskal
lines = sys.stdin.read().strip().split("\n")
n = int(lines[0])
edges = [Edge(*map(int, ln.split())) for ln in lines[1:]]
total, mst = kruskal(n, edges)
print(total)
print(" ".join(f"{e.u}-{e.v}:{e.w}" for e in mst))
