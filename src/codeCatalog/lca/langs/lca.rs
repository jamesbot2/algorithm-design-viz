// LCA by binary lifting. par[v-1] = parent of node v (1..n-1), must satisfy par[v-1] < v; node 0 is the root. queries = flat pairs (u v).
pub fn lca_all(par: &[i64], queries: &[i64]) -> Vec<i64> {
    let n = par.len() + 1;
    let mut log = 1usize;
    while (1usize << log) < n { log += 1; }
    let mut depth = vec![0usize; n];
    for v in 1..n { depth[v] = depth[par[v - 1] as usize] + 1; } // @a: lcaDepth
    let mut up = vec![vec![0usize; n]; log];
    for v in 1..n { up[0][v] = par[v - 1] as usize; } // @a: lcaBase
    for j in 1..log { for v in 0..n { up[j][v] = up[j - 1][up[j - 1][v]]; } } // @a: lcaTable
    let mut out = Vec::new();
    for q in queries.chunks_exact(2) {
        let (mut u, mut v) = (q[0] as usize, q[1] as usize);
        if depth[u] < depth[v] { std::mem::swap(&mut u, &mut v); }
        let diff = depth[u] - depth[v];
        for j in 0..log {
            if (diff >> j) & 1 == 1 { u = up[j][u]; } // @a: lcaLift
        }
        if u != v {
            for j in (0..log).rev() {
                if up[j][u] != up[j][v] { u = up[j][u]; v = up[j][v]; } // @a: lcaJump
            }
            u = up[0][u]; // @a: lcaParent
        }
        out.push(u as i64); // @a: lcaAnswer
    }
    out
}
