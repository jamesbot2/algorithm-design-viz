/// BFS shortest path on unweighted graph — complete Rust reference.
pub fn bfs(adj: &[Vec<usize>], start: usize) -> (Vec<i64>, Vec<i64>) {
    let n = adj.len();
    let mut dist = vec![-1i64; n];
    let mut parent = vec![-1i64; n];
    let mut q: Vec<usize> = vec![start]; // @a: init
    dist[start] = 0;
    let mut head = 0;
    while head < q.len() {
        let u = q[head]; // @a: dequeue+1
        head += 1;
        for &v in &adj[u] {
            if dist[v] < 0 { // @a: visit
                dist[v] = dist[u] + 1;
                parent[v] = u as i64;
                q.push(v); // @a: enqueue
            }
        }
    }
    (dist, parent) // @a: done
}
