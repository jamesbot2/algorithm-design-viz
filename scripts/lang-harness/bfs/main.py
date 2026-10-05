import sys
from algo import bfs
lines = sys.stdin.read().split("\n")
n, start = map(int, lines[0].split())
adj = [[int(x) for x in lines[1 + i].split()] for i in range(n)]
dist, parent = bfs(adj, start)
print(" ".join(map(str, dist)))
print(" ".join(map(str, parent)))
