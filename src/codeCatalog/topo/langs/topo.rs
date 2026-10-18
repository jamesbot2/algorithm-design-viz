// Kahn's topological sort. Returns [status, order...]: status 1 = acyclic (order has n nodes), 0 = cycle (order = nodes processed before it blocked).
pub fn topo_sort(n: i64, edges: &[i64]) -> Vec<i64> {
    let n = n as usize;
    let mut adj: Vec<Vec<usize>> = vec![Vec::new(); n];
    let mut indeg = vec![0usize; n];
    for e in edges.chunks_exact(2) {
        adj[e[0] as usize].push(e[1] as usize); // @a: tsBuild+1
        indeg[e[1] as usize] += 1;
    }
    let mut queue: Vec<usize> = (0..n).filter(|&v| indeg[v] == 0).collect(); // @a: tsSeed
    let mut order: Vec<i64> = Vec::new();
    let mut head = 0;
    while head < queue.len() {
        let u = queue[head]; // @a: tsPop
        head += 1;
        order.push(u as i64);
        for k in 0..adj[u].len() {
            let v = adj[u][k];
            indeg[v] -= 1; // @a: tsRelax
            if indeg[v] == 0 { queue.push(v); } // @a: tsEnqueue
        }
    }
    let mut res = vec![if order.len() == n { 1 } else { 0 }]; // @a: tsResult
    res.extend(order);
    res
}
