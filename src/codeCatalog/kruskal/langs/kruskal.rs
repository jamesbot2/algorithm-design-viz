/// Kruskal MST — complete Rust reference (union-find with path compression).
#[derive(Clone, Copy)]
pub struct Edge {
    pub u: usize,
    pub v: usize,
    pub w: i64,
}

pub fn kruskal(n: usize, edges: &[Edge]) -> (i64, Vec<Edge>) {
    fn find(parent: &mut Vec<usize>, x: usize) -> usize {
        if parent[x] != x {
            let p = parent[x];
            parent[x] = find(parent, p);
        }
        parent[x]
    }
    let mut parent: Vec<usize> = (0..n).collect();
    let mut sorted = edges.to_vec();
    sorted.sort_by_key(|e| e.w); // @a: sort
    let mut mst: Vec<Edge> = Vec::new();
    let mut total = 0;
    for e in sorted {
        let a = find(&mut parent, e.u); // @a: find
        let b = find(&mut parent, e.v);
        if a == b { // @a: skip+1
            continue;
        }
        parent[a] = b; // @a: union
        mst.push(e);
        total += e.w;
        if mst.len() == n - 1 {
            break;
        }
    }
    (total, mst) // @a: done
}
