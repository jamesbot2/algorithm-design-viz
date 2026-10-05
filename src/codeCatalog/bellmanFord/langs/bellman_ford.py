from typing import NamedTuple


class Edge(NamedTuple):
    u: int
    v: int
    w: float


def bellman_ford(n: int, edges: list[Edge], start: int) -> tuple[list[float], list[int], bool]:
    """Bellman-Ford — complete Python reference. Returns (dist, parent, neg_cycle)."""
    INF = float("inf")
    dist = [INF] * n
    parent = [-1] * n
    dist[start] = 0  # @a: init
    for _ in range(n - 1):  # @a: round
        for e in edges:
            if dist[e.u] + e.w < dist[e.v]:  # @a: relax
                dist[e.v] = dist[e.u] + e.w  # @a: update
                parent[e.v] = e.u
    neg_cycle = False
    for e in edges:
        if dist[e.u] + e.w < dist[e.v]:
            neg_cycle = True  # @a: negCycle
            break
    return dist, parent, neg_cycle  # @a: done
