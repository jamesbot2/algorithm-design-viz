/// Dijkstra with binary heap — complete Rust reference (hand-written heap of (u, d), lazy deletion).
pub fn dijkstra_heap(n: usize, start: usize, adj: &[Vec<(usize, f64)>]) -> (Vec<f64>, Vec<i64>) {
    fn push(heap: &mut Vec<(usize, f64)>, u: usize, d: f64) {
        heap.push((u, d));
        let mut i = heap.len() - 1;
        while i > 0 {
            let p = (i - 1) >> 1;
            if heap[p].1 <= heap[i].1 {
                break;
            }
            heap.swap(p, i);
            i = p;
        }
    }
    fn pop(heap: &mut Vec<(usize, f64)>) -> Option<(usize, f64)> {
        if heap.is_empty() {
            return None;
        }
        let top = heap[0];
        let last = heap.pop().unwrap();
        if !heap.is_empty() {
            heap[0] = last;
            let mut i = 0;
            loop {
                let l = i * 2 + 1;
                let r = l + 1;
                let mut best = i;
                if l < heap.len() && heap[l].1 < heap[best].1 { best = l; }
                if r < heap.len() && heap[r].1 < heap[best].1 { best = r; }
                if best == i {
                    break;
                }
                heap.swap(i, best);
                i = best;
            }
        }
        Some(top)
    }
    const INF: f64 = f64::INFINITY;
    let mut dist = vec![INF; n];
    let mut parent = vec![-1i64; n];
    dist[start] = 0.0; // @a: init
    let mut heap: Vec<(usize, f64)> = vec![(start, 0.0)];
    while !heap.is_empty() {
        let (cu, cd) = pop(&mut heap).unwrap(); // @a: extract
        if cd != dist[cu] { // @a: stale+1
            continue;
        }
        for &(v, w) in &adj[cu] {
            if dist[cu] + w < dist[v] { // @a: relax
                dist[v] = dist[cu] + w;
                parent[v] = cu as i64;
                push(&mut heap, v, dist[v]);
            }
        }
    }
    (dist, parent) // @a: done, return
}
