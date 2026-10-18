"""Kahn's topological sort. Returns [status, *order]: status 1 = acyclic (order has n nodes), 0 = cycle (order = nodes processed before it blocked)."""


def topo_sort(n: int, edges: list[int]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    for i in range(0, len(edges) - 1, 2):
        adj[edges[i]].append(edges[i + 1])  # @a: tsBuild+1
        indeg[edges[i + 1]] += 1
    queue = [v for v in range(n) if indeg[v] == 0]  # @a: tsSeed
    order: list[int] = []
    head = 0
    while head < len(queue):
        u = queue[head]  # @a: tsPop
        head += 1
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1  # @a: tsRelax
            if indeg[v] == 0:  # @a: tsEnqueue+1
                queue.append(v)
    return [1 if len(order) == n else 0] + order  # @a: tsResult
