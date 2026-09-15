/**
 * Naive Dijkstra (non-negative weights) — complete TypeScript reference.
 * Anchors: init | selectMin | relax.condition | relax.update
 */
export function naiveDijkstra(
  n: number,
  start: number,
  adj: { v: number; w: number }[][],
): { dist: number[]; parent: number[] } {
  const INF = Number.POSITIVE_INFINITY
  const dist = Array<number>(n).fill(INF)
  const done = Array<boolean>(n).fill(false)
  const parent = Array<number>(n).fill(-1)
  // @anchor init
  dist[start] = 0
  for (let iter = 0; iter < n; iter++) {
    let u = -1
    let best = INF
    for (let i = 0; i < n; i++) {
      // @anchor selectMin
      if (!done[i] && dist[i]! < best) {
        best = dist[i]!
        u = i
      }
    }
    if (u < 0 || best === INF) break
    done[u] = true
    for (const { v, w } of adj[u]!) {
      // @anchor relax.condition
      if (dist[u]! + w < dist[v]!) {
        // @anchor relax.update
        dist[v] = dist[u]! + w
        parent[v] = u
      }
    }
  }
  return { dist, parent }
}
