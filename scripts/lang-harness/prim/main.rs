include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut lines = s.trim().split('\n');
    let h: Vec<usize> = lines.next().unwrap().split_whitespace().map(|x| x.parse().unwrap()).collect();
    let n = h[0];
    let mut adj: Vec<Vec<(usize, f64)>> = vec![Vec::new(); n];
    for ln in lines {
        let f: Vec<f64> = ln.split_whitespace().map(|x| x.parse().unwrap()).collect();
        let (u, v) = (f[0] as usize, f[1] as usize);
        adj[u].push((v, f[2]));
        adj[v].push((u, f[2]));
    }
    let (total, parent) = prim(n, &adj, h[1]);
    let mut es: Vec<String> = Vec::new();
    for (i, &p) in parent.iter().enumerate() {
        if p >= 0 {
            let p = p as usize;
            es.push(format!("{}-{}", p.min(i), p.max(i)));
        }
    }
    es.sort();
    println!("{}", total as i64);
    println!("{}", es.join(" "));
}
