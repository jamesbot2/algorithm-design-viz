from typing import Optional


def dijkstra_heap(n: int, start: int, adj: list[list[tuple[int, float]]]) -> tuple[list[float], list[int]]:
    """Dijkstra with binary heap — complete Python reference (hand-written heap of (u, d), lazy deletion)."""
    INF = float("inf")
    dist = [INF] * n
    parent = [-1] * n
    dist[start] = 0  # @a: init
    heap: list[tuple[int, float]] = [(start, 0)]

    def push(u: int, d: float) -> None:
        heap.append((u, d))
        i = len(heap) - 1
        while i > 0:
            p = (i - 1) >> 1
            if heap[p][1] <= heap[i][1]:
                break
            heap[p], heap[i] = heap[i], heap[p]
            i = p

    def pop() -> Optional[tuple[int, float]]:
        if not heap:
            return None
        top = heap[0]
        last = heap.pop()
        if heap:
            heap[0] = last
            i = 0
            while True:
                l = i * 2 + 1
                r = l + 1
                best = i
                if l < len(heap) and heap[l][1] < heap[best][1]:
                    best = l
                if r < len(heap) and heap[r][1] < heap[best][1]:
                    best = r
                if best == i:
                    break
                heap[i], heap[best] = heap[best], heap[i]
                i = best
        return top

    while heap:
        cur_u, cur_d = pop()  # @a: extract
        if cur_d != dist[cur_u]:  # @a: stale+1
            continue
        for v, w in adj[cur_u]:
            if dist[cur_u] + w < dist[v]:  # @a: relax
                dist[v] = dist[cur_u] + w
                parent[v] = cur_u
                push(v, dist[v])
    return dist, parent  # @a: done, return
