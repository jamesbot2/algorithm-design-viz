/// Naive Dijkstra (non-negative weights) — complete Rust reference. adj[u] = [(v, w), ...].
pub fn naive_dijkstra(n: usize, start: usize, adj: &[Vec<(usize, f64)>]) -> (Vec<f64>, Vec<i64>) {
    const INF: f64 = f64::INFINITY;
    let mut dist = vec![INF; n];
    let mut done = vec![false; n];
    let mut parent = vec![-1i64; n];
    dist[start] = 0.0; // @a: init
    for _ in 0..n {
        let mut u: Option<usize> = None;
        let mut best = INF;
        for i in 0..n {
            if !done[i] && dist[i] < best { // @a: selectMin
                best = dist[i];
                u = Some(i);
            }
        }
        let u = match u { Some(u) if best != INF => u, _ => break };
        done[u] = true;
        for &(v, w) in &adj[u] {
            if dist[u] + w < dist[v] { // @a: relax.condition
                dist[v] = dist[u] + w; // @a: relax.update
                parent[v] = u as i64;
            }
        }
    }
    (dist, parent) // @a: done, return
}
