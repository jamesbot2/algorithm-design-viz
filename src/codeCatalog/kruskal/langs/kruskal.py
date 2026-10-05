from typing import NamedTuple


class Edge(NamedTuple):
    u: int
    v: int
    w: int


def kruskal(n: int, edges: list[Edge]) -> tuple[int, list[Edge]]:
    """Kruskal MST — complete Python reference (union-find with path compression)."""
    parent = list(range(n))

    def find(x: int) -> int:
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    sorted_edges = sorted(edges, key=lambda e: e.w)  # @a: sort
    mst: list[Edge] = []
    total = 0
    for e in sorted_edges:
        a = find(e.u)  # @a: find
        b = find(e.v)
        if a == b:  # @a: skip+1
            continue
        parent[a] = b  # @a: union
        mst.append(e)
        total += e.w
        if len(mst) == n - 1:
            break
    return total, mst  # @a: done
