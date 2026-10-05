def prim(n: int, adj: list[list[tuple[int, float]]], start: int = 0) -> tuple[float, list[int]]:
    """Prim MST (dense O(V^2)) — complete Python reference. adj[u] = [(v, w), ...] (undirected)."""
    INF = float("inf")
    key = [INF] * n
    parent = [-1] * n
    in_mst = [False] * n
    key[start] = 0  # @a: init
    for _ in range(n):
        u = -1
        best = INF
        for i in range(n):
            if not in_mst[i] and key[i] < best:  # @a: selectMin
                best = key[i]
                u = i
        if u < 0:
            break
        in_mst[u] = True  # @a: add
        for v, w in adj[u]:
            if not in_mst[v] and w < key[v]:  # @a: relax
                key[v] = w  # @a: update+1
                parent[v] = u
    total = 0
    for i in range(n):
        if parent[i] >= 0:
            total += key[i]
    return total, parent  # @a: done
