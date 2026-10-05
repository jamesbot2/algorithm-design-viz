/// Bellman-Ford — complete Rust reference. Returns (dist, parent, neg_cycle).
pub struct Edge {
    pub u: usize,
    pub v: usize,
    pub w: f64,
}

pub fn bellman_ford(n: usize, edges: &[Edge], start: usize) -> (Vec<f64>, Vec<i64>, bool) {
    const INF: f64 = f64::INFINITY;
    let mut dist = vec![INF; n];
    let mut parent = vec![-1i64; n];
    dist[start] = 0.0; // @a: init
    for _ in 0..n.saturating_sub(1) { // @a: round
        for e in edges {
            if dist[e.u] + e.w < dist[e.v] { // @a: relax
                dist[e.v] = dist[e.u] + e.w; // @a: update
                parent[e.v] = e.u as i64;
            }
        }
    }
    let mut neg_cycle = false;
    for e in edges {
        if dist[e.u] + e.w < dist[e.v] {
            neg_cycle = true; // @a: negCycle
            break;
        }
    }
    (dist, parent, neg_cycle) // @a: done
}
