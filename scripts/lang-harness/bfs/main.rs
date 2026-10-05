include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let lines: Vec<&str> = s.split('\n').collect();
    let h: Vec<usize> = lines[0].split_whitespace().map(|x| x.parse().unwrap()).collect();
    let adj: Vec<Vec<usize>> = (0..h[0]).map(|i| lines[1 + i].split_whitespace().map(|x| x.parse().unwrap()).collect()).collect();
    let (dist, parent) = bfs(&adj, h[1]);
    let d: Vec<String> = dist.iter().map(|x| x.to_string()).collect();
    let p: Vec<String> = parent.iter().map(|x| x.to_string()).collect();
    println!("{}", d.join(" "));
    println!("{}", p.join(" "));
}
