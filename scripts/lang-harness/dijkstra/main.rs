include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut lines = s.trim().split('\n');
    let h: Vec<usize> = lines.next().unwrap().split_whitespace().map(|x| x.parse().unwrap()).collect();
    let (n, start) = (h[0], h[1]);
    let mut adj: Vec<Vec<(usize, f64)>> = vec![Vec::new(); n];
    for ln in lines {
        let f: Vec<f64> = ln.split_whitespace().map(|x| x.parse().unwrap()).collect();
        adj[f[0] as usize].push((f[1] as usize, f[2]));
    }
    let (dist, parent) = naive_dijkstra(n, start, &adj);
    let d: Vec<String> = dist.iter().map(|x| if x.is_infinite() { "INF".to_string() } else { format!("{}", *x as i64) }).collect();
    let p: Vec<String> = parent.iter().map(|x| x.to_string()).collect();
    println!("{}", d.join(" "));
    println!("{}", p.join(" "));
}
