def naive_dijkstra(n: int, start: int, adj: list[list[tuple[int, float]]]) -> tuple[list[float], list[int]]:
    """Naive Dijkstra (non-negative weights) — complete Python reference. adj[u] = [(v, w), ...]."""
    INF = float("inf")
    dist = [INF] * n
    done = [False] * n
    parent = [-1] * n
    dist[start] = 0  # @a: init
    for _ in range(n):
        u = -1
        best = INF
        for i in range(n):
            if not done[i] and dist[i] < best:  # @a: selectMin
                best = dist[i]
                u = i
        if u < 0 or best == INF:
            break
        done[u] = True
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:  # @a: relax.condition
                dist[v] = dist[u] + w  # @a: relax.update
                parent[v] = u
    return dist, parent  # @a: done, return
