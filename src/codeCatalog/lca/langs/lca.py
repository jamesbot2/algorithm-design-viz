"""LCA by binary lifting. par[v-1] = parent of node v (1..n-1) and must satisfy par[v-1] < v; node 0 is the root. queries = flat pairs (u v)."""


def lca_all(par: list[int], queries: list[int]) -> list[int]:
    n = len(par) + 1
    log = 1
    while (1 << log) < n:
        log += 1
    depth = [0] * n
    for v in range(1, n):
        depth[v] = depth[par[v - 1]] + 1  # @a: lcaDepth
    up = [[0] + par]  # @a: lcaBase
    for j in range(1, log):
        prev = up[j - 1]
        up.append([prev[prev[v]] for v in range(n)])  # @a: lcaTable
    out: list[int] = []
    for q in range(0, len(queries) - 1, 2):
        u, v = queries[q], queries[q + 1]
        if depth[u] < depth[v]:
            u, v = v, u
        diff = depth[u] - depth[v]
        for j in range(log):
            if (diff >> j) & 1:  # @a: lcaLift+1
                u = up[j][u]
        if u != v:
            for j in range(log - 1, -1, -1):
                if up[j][u] != up[j][v]:  # @a: lcaJump+2
                    u = up[j][u]
                    v = up[j][v]
            u = up[0][u]  # @a: lcaParent
        out.append(u)  # @a: lcaAnswer
    return out
