/// Prim MST (dense O(V^2)) — complete Rust reference. adj[u] = [(v, w), ...] (undirected).
pub fn prim(n: usize, adj: &[Vec<(usize, f64)>], start: usize) -> (f64, Vec<i64>) {
    const INF: f64 = f64::INFINITY;
    let mut key = vec![INF; n];
    let mut parent = vec![-1i64; n];
    let mut in_mst = vec![false; n];
    key[start] = 0.0; // @a: init
    for _ in 0..n {
        let mut u: Option<usize> = None;
        let mut best = INF;
        for i in 0..n {
            if !in_mst[i] && key[i] < best { // @a: selectMin
                best = key[i];
                u = Some(i);
            }
        }
        let Some(u) = u else { break };
        in_mst[u] = true; // @a: add
        for &(v, w) in &adj[u] {
            if !in_mst[v] && w < key[v] { // @a: relax
                key[v] = w; // @a: update+1
                parent[v] = u as i64;
            }
        }
    }
    let mut total = 0.0;
    for i in 0..n {
        if parent[i] >= 0 {
            total += key[i];
        }
    }
    (total, parent) // @a: done
}
