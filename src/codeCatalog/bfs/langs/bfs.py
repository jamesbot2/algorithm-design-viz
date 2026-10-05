def bfs(adj: list[list[int]], start: int) -> tuple[list[int], list[int]]:
    """BFS shortest path on unweighted graph — complete Python reference."""
    n = len(adj)
    dist = [-1] * n
    parent = [-1] * n
    q = [start]  # @a: init
    dist[start] = 0
    head = 0
    while head < len(q):
        u = q[head]  # @a: dequeue+1
        head += 1
        for v in adj[u]:
            if dist[v] < 0:  # @a: visit
                dist[v] = dist[u] + 1
                parent[v] = u
                q.append(v)  # @a: enqueue
    return dist, parent  # @a: done
