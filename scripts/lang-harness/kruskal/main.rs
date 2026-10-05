include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut lines = s.trim().split('\n');
    let n: usize = lines.next().unwrap().trim().parse().unwrap();
    let edges: Vec<Edge> = lines
        .map(|ln| {
            let f: Vec<i64> = ln.split_whitespace().map(|x| x.parse().unwrap()).collect();
            Edge { u: f[0] as usize, v: f[1] as usize, w: f[2] }
        })
        .collect();
    let (total, mst) = kruskal(n, &edges);
    println!("{}", total);
    let m: Vec<String> = mst.iter().map(|e| format!("{}-{}:{}", e.u, e.v, e.w)).collect();
    println!("{}", m.join(" "));
}
