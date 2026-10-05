include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut lines = s.trim().split('\n');
    let h: Vec<&str> = lines.next().unwrap().split_whitespace().collect();
    let (n, start): (usize, usize) = (h[0].parse().unwrap(), h[1].parse().unwrap());
    let edges: Vec<Edge> = lines
        .map(|ln| {
            let f: Vec<f64> = ln.split_whitespace().map(|x| x.parse().unwrap()).collect();
            Edge { u: f[0] as usize, v: f[1] as usize, w: f[2] }
        })
        .collect();
    let (dist, parent, neg) = bellman_ford(n, &edges, start);
    if h[2] == "full" {
        let d: Vec<String> = dist.iter().map(|x| if x.is_infinite() { "INF".to_string() } else { format!("{}", *x as i64) }).collect();
        let p: Vec<String> = parent.iter().map(|x| x.to_string()).collect();
        println!("{}", d.join(" "));
        println!("{}", p.join(" "));
    }
    println!("{}", neg);
}
